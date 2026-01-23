// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Logger } from 'pino'
import {
    AuthContext,
    UserId,
    AuthAware,
    assertConnected,
    AccessTokenProvider,
    Idp,
} from '@canton-network/core-wallet-auth'
import {
    Store,
    Wallet,
    PartyId,
    Session,
    WalletFilter,
    Transaction,
    Network,
    UpdateWallet,
} from '@canton-network/core-wallet-store'
import {
    LedgerClient,
    defaultRetryableOptions,
} from '@canton-network/core-ledger-client'

interface UserStorage {
    wallets: Array<Wallet>
    transactions: Map<string, Transaction>
    session: Session | undefined
}

export interface StoreInternalConfig {
    idps: Array<Idp>
    networks: Array<Network>
}

type Memory = Map<UserId, UserStorage>

// TODO: remove AuthAware and instead provide wrapper in clients
export class StoreInternal implements Store, AuthAware<StoreInternal> {
    private logger: Logger
    private systemStorage: StoreInternalConfig
    private userStorage: Memory

    authContext: AuthContext | undefined

    constructor(
        config: StoreInternalConfig,
        logger: Logger,
        authContext?: AuthContext,
        userStorage?: Memory
    ) {
        this.logger = logger.child({ component: 'StoreInternal' })
        this.systemStorage = config
        this.authContext = authContext
        this.userStorage = userStorage || new Map()

        this.syncWallets()
    }

    withAuthContext(context?: AuthContext): StoreInternal {
        return new StoreInternal(
            this.systemStorage,
            this.logger,
            context,
            this.userStorage
        )
    }

    static createStorage(): UserStorage {
        return {
            wallets: [],
            transactions: new Map<string, Transaction>(),
            session: undefined,
        }
    }

    private assertConnected(): UserId {
        return assertConnected(this.authContext).userId
    }

    private getStorage(): UserStorage {
        const userId = this.assertConnected()
        if (!this.userStorage.has(userId)) {
            this.userStorage.set(userId, StoreInternal.createStorage())
        }
        return this.userStorage.get(userId)!
    }

    private updateStorage(storage: UserStorage): void {
        const userId = this.assertConnected()
        this.userStorage.set(userId, storage)
    }

    // Wallet methods

    private async syncWallets(): Promise<void> {
        try {
            const network = await this.getCurrentNetwork()

            // Get existing parties from participant
            const userAccessTokenProvider: AccessTokenProvider = {
                getUserAccessToken: async () => this.authContext!.accessToken,
                getAdminAccessToken: async () => this.authContext!.accessToken,
            }

            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger: this.logger,
                accessTokenProvider: userAccessTokenProvider,
            })
            const rights = await ledgerClient.getWithRetry(
                '/v2/users/{user-id}/rights',
                defaultRetryableOptions,
                {
                    path: {
                        'user-id': this.authContext!.userId,
                    },
                }
            )
            const parties = rights.rights
                ?.filter((right) => 'CanActAs' in right.kind)
                .map((right) => {
                    if ('CanActAs' in right.kind) {
                        return right.kind.CanActAs.value.party
                    }
                    throw new Error('Unexpected right kind')
                })

            // Merge Wallets - check for duplicates by (partyId, networkId)
            const existingWallets = await this.getWallets({
                networkIds: [network.id],
            })
            const existingPartyNetworkPairs = new Set(
                existingWallets.map((w) => `${w.partyId}:${w.networkId}`)
            )
            const participantWallets: Array<Wallet> =
                parties
                    ?.filter(
                        (party) =>
                            !existingPartyNetworkPairs.has(
                                `${party}:${network.id}`
                            )
                        // todo: filter on idp id
                    )
                    .map((party) => {
                        const [hint, namespace] = party.split('::')
                        return {
                            primary: false,
                            partyId: party,
                            status: 'allocated',
                            hint: hint,
                            publicKey: namespace,
                            namespace: namespace,
                            networkId: network.id,
                            signingProviderId: 'participant', // todo: determine based on partyDetails.isLocal
                        }
                    }) || []
            const storage = this.getStorage()
            const wallets = [...storage.wallets, ...participantWallets]

            // Set primary wallet if none exists in this network
            const networkWallets = wallets.filter(
                (w) => w.networkId === network.id
            )
            const hasPrimary = networkWallets.some((w) => w.primary)
            if (!hasPrimary && networkWallets.length > 0) {
                networkWallets[0].primary = true
            }

            this.logger.debug(wallets, 'Wallets synchronized')

            // Update storage with new wallets
            storage.wallets = wallets
            this.updateStorage(storage)
        } catch {
            return
        }
    }

    async getWallets(filter: WalletFilter = {}): Promise<Array<Wallet>> {
        const { networkIds, signingProviderIds } = filter
        const networkIdSet = networkIds ? new Set(networkIds) : null
        const signingProviderIdSet = signingProviderIds
            ? new Set(signingProviderIds)
            : null

        return this.getStorage().wallets.filter((wallet) => {
            const matchedNetworkIds = networkIdSet
                ? networkIdSet.has(wallet.networkId)
                : true
            const matchedSigningProviderIds = signingProviderIdSet
                ? signingProviderIdSet.has(wallet.signingProviderId)
                : true
            return matchedNetworkIds && matchedSigningProviderIds
        })
    }

    async getPrimaryWallet(): Promise<Wallet | undefined> {
        const network = await this.getCurrentNetwork()
        const wallets = await this.getWallets({ networkIds: [network.id] })
        return wallets.find((w) => w.primary === true)
    }

    async setPrimaryWallet(partyId: PartyId): Promise<void> {
        const network = await this.getCurrentNetwork()
        const storage = this.getStorage()
        const networkWallets = storage.wallets.filter(
            (w) => w.networkId === network.id
        )

        if (!networkWallets.some((w) => w.partyId === partyId)) {
            throw new Error(
                `Wallet with partyId "${partyId}" not found in network "${network.id}"`
            )
        }

        const wallets = storage.wallets.map((w) => {
            if (w.networkId === network.id) {
                if (w.partyId === partyId) {
                    w.primary = true
                } else {
                    w.primary = false
                }
            }
            return w
        })
        storage.wallets = wallets
        this.updateStorage(storage)
    }

    async addWallet(wallet: Wallet): Promise<void> {
        const storage = this.getStorage()
        if (
            storage.wallets.some(
                (w) =>
                    w.partyId === wallet.partyId &&
                    w.networkId === wallet.networkId
            )
        ) {
            throw new Error(
                `Wallet with partyId "${wallet.partyId}" already exists in network "${wallet.networkId}"`
            )
        }
        const networkWallets = await this.getWallets({
            networkIds: [wallet.networkId],
        })

        // If this is the first wallet in this network, set it as primary automatically
        if (networkWallets.length === 0) {
            wallet.primary = true
        }

        if (wallet.primary) {
            // If the new wallet is primary, set all others in the same network to non-primary
            storage.wallets
                .filter((w) => w.networkId === wallet.networkId)
                .map((w) => (w.primary = false))
        }
        storage.wallets.push(wallet)
        this.updateStorage(storage)
    }

    async updateWallet({
        status,
        partyId,
        networkId,
        externalTxId,
    }: UpdateWallet): Promise<void> {
        const storage = this.getStorage()
        // Use provided networkId or get current network from session
        const targetNetworkId = networkId ?? (await this.getCurrentNetwork()).id

        const wallets = storage.wallets.map((wallet) =>
            wallet.partyId === partyId && wallet.networkId === targetNetworkId
                ? { ...wallet, status, externalTxId }
                : wallet
        )

        storage.wallets = wallets
        this.updateStorage(storage)
    }

    async removeWallet(partyId: PartyId): Promise<void> {
        const network = await this.getCurrentNetwork()
        const storage = this.getStorage()
        const wallets = storage.wallets.filter(
            (w) => !(w.partyId === partyId && w.networkId === network.id)
        )

        storage.wallets = wallets
        this.updateStorage(storage)
    }

    // Session methods
    async getSession(): Promise<Session | undefined> {
        return this.getStorage().session
    }

    async setSession(session: Session): Promise<void> {
        const storage = this.getStorage()
        storage.session = session
        this.updateStorage(storage)
    }

    async removeSession(): Promise<void> {
        const storage = this.getStorage()
        storage.session = undefined
        this.updateStorage(storage)
    }

    // IDP methods
    async getIdp(idpId: string): Promise<Idp> {
        this.assertConnected()
        const idps = await this.listIdps()
        const idp = idps.find((i) => i.id === idpId)
        if (!idp) {
            throw new Error(`IdP "${idpId}" not found`)
        }
        return idp
    }

    async listIdps(): Promise<Array<Idp>> {
        this.assertConnected()
        return this.systemStorage.idps
    }

    async addIdp(idp: Idp): Promise<void> {
        this.assertConnected()
        const existingIdp = await this.listIdps()

        if (existingIdp.find((i) => i.id === idp.id)) {
            throw new Error(`IdP "${idp.id}" already exists`)
        }

        this.systemStorage.idps.push(idp)
    }

    async updateIdp(idp: Idp): Promise<void> {
        this.assertConnected()
        const existingIdps = await this.listIdps()
        const index = existingIdps.findIndex((i) => i.id === idp.id)
        if (index === -1) {
            throw new Error(`IdP "${idp.id}" not found`)
        }
        this.systemStorage.idps[index] = idp
    }

    async removeIdp(idpId: string): Promise<void> {
        this.assertConnected()
        this.systemStorage.idps = this.systemStorage.idps.filter(
            (i) => i.id !== idpId
        )
    }

    // Network methods
    async getNetwork(networkId: string): Promise<Network> {
        this.assertConnected()

        const networks = await this.listNetworks()
        if (!networks) throw new Error('No networks available')

        const network = networks.find((n) => n.id === networkId)
        if (!network) throw new Error(`Network "${networkId}" not found`)
        return network
    }

    async getCurrentNetwork(): Promise<Network> {
        const session = this.getStorage().session
        if (!session) {
            throw new Error('No session found')
        }
        const networkId = session.network
        if (!networkId) {
            throw new Error('No current network set in session')
        }

        const networks = await this.listNetworks()
        const network = networks.find((n) => n.id === networkId)
        if (!network) {
            throw new Error(`Network "${networkId}" not found`)
        }
        return network
    }

    async listNetworks(): Promise<Array<Network>> {
        return this.systemStorage.networks
    }

    async updateNetwork(network: Network): Promise<void> {
        this.assertConnected()
        this.removeNetwork(network.id) // Ensure no duplicates
        this.systemStorage.networks.push(network)
    }

    async addNetwork(network: Network): Promise<void> {
        const networkAlreadyExists = this.systemStorage.networks.find(
            (n) => n.id === network.id
        )
        if (networkAlreadyExists) {
            throw new Error(`Network ${network.id} already exists`)
        } else {
            this.systemStorage.networks.push(network)
        }
    }

    async removeNetwork(networkId: string): Promise<void> {
        this.assertConnected()
        this.systemStorage.networks = this.systemStorage.networks.filter(
            (n) => n.id !== networkId
        )
    }

    // Transaction methods
    async setTransaction(transaction: Transaction): Promise<void> {
        this.assertConnected()
        const storage = this.getStorage()

        storage.transactions.set(transaction.commandId, transaction)
        this.updateStorage(storage)
    }

    async getTransaction(commandId: string): Promise<Transaction | undefined> {
        this.assertConnected()
        const storage = this.getStorage()

        return storage.transactions.get(commandId)
    }

    async listTransactions(): Promise<Array<Transaction>> {
        this.assertConnected()
        const storage = this.getStorage()

        return Array.from(storage.transactions.values())
    }
}
