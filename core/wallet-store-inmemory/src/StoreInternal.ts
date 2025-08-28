import { Logger } from 'pino'
import {
    AuthContext,
    UserId,
    AuthAware,
} from '@canton-network/core-wallet-auth'
import {
    Store,
    Wallet,
    PartyId,
    Session,
    WalletFilter,
    Transaction,
    Network,
} from '@canton-network/core-wallet-store'
import { LedgerClient } from '@canton-network/core-ledger-client'

interface UserStorage {
    wallets: Array<Wallet>
    transactions: Map<string, Transaction>
    session: Session | undefined
}

export interface StoreInternalConfig {
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
        if (!this.authContext) {
            throw new Error('User is not connected')
        }
        return this.authContext.userId
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
            const ledgerClient = new LedgerClient(
                network.ledgerApi.baseUrl,
                this.authContext!.accessToken,
                this.logger
            )
            const rights = await ledgerClient.get(
                '/v2/users/{user-id}/rights',
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

            // Merge Wallets
            const existingWallets = await this.getWallets()
            const existingPartyIds = new Set(
                existingWallets.map((w) => w.partyId)
            )
            const participantWallets: Array<Wallet> =
                parties
                    ?.filter(
                        (party) => !existingPartyIds.has(party)
                        // todo: filter on idp id
                    )
                    .map((party) => {
                        const [hint, namespace] = party.split('::')
                        return {
                            primary: false,
                            partyId: party,
                            hint: hint,
                            publicKey: namespace,
                            namespace: namespace,
                            chainId: network.chainId,
                            signingProviderId: 'participant', // todo: determine based on partyDetails.isLocal
                        }
                    }) || []
            const storage = this.getStorage()
            const wallets = [...storage.wallets, ...participantWallets]

            // Set primary wallet if none exists
            const hasPrimary = wallets.some((w) => w.primary)
            if (!hasPrimary && wallets.length > 0) {
                wallets[0].primary = true
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
        const { chainIds, signingProviderIds } = filter
        const chainIdSet = chainIds ? new Set(chainIds) : null
        const signingProviderIdSet = signingProviderIds
            ? new Set(signingProviderIds)
            : null

        return this.getStorage().wallets.filter((wallet) => {
            const matchedChainIds = chainIdSet
                ? chainIdSet.has(wallet.chainId)
                : true
            const matchedStorageProviderIdS = signingProviderIdSet
                ? signingProviderIdSet.has(wallet.signingProviderId)
                : true
            return matchedChainIds && matchedStorageProviderIdS
        })
    }

    async getPrimaryWallet(): Promise<Wallet | undefined> {
        const wallets = await this.getWallets()
        return wallets.find((w) => w.primary === true)
    }

    async setPrimaryWallet(partyId: PartyId): Promise<void> {
        const storage = this.getStorage()
        if (!storage.wallets.some((w) => w.partyId === partyId)) {
            throw new Error(`Wallet with partyId "${partyId}" not found`)
        }
        const wallets = storage.wallets.map((w) => {
            if (w.partyId === partyId) {
                w.primary = true
            } else {
                w.primary = false
            }
            return w
        })
        storage.wallets = wallets
        this.updateStorage(storage)
    }

    async addWallet(wallet: Wallet): Promise<void> {
        const storage = this.getStorage()
        if (storage.wallets.some((w) => w.partyId === wallet.partyId)) {
            throw new Error(
                `Wallet with partyId "${wallet.partyId}" already exists`
            )
        }
        const wallets = await this.getWallets()

        if (wallets.length === 0) {
            // If this is the first wallet, set it as primary automatically
            wallet.primary = true
        }

        if (wallet.primary) {
            // If the new wallet is primary, set all others to non-primary
            storage.wallets.map((w) => (w.primary = false))
        }
        wallets.push(wallet)
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

    // Network methods
    async getNetwork(chainId: string): Promise<Network> {
        this.assertConnected()

        const networks = await this.listNetworks()
        if (!networks) throw new Error('No networks available')

        const network = networks.find((n) => n.chainId === chainId)
        if (!network) throw new Error(`Network "${chainId}" not found`)
        return network
    }

    async getCurrentNetwork(): Promise<Network> {
        const session = this.getStorage().session
        if (!session) {
            throw new Error('No session found')
        }
        const chainId = session.network
        if (!chainId) {
            throw new Error('No current network set in session')
        }

        const networks = await this.listNetworks()
        const network = networks.find((n) => n.chainId === chainId)
        if (!network) {
            throw new Error(`Network "${chainId}" not found`)
        }
        return network
    }

    async listNetworks(): Promise<Array<Network>> {
        return this.systemStorage.networks
    }

    async updateNetwork(network: Network): Promise<void> {
        this.assertConnected()
        this.removeNetwork(network.chainId) // Ensure no duplicates
        this.systemStorage.networks.push(network)
    }

    async addNetwork(network: Network): Promise<void> {
        const networkAlreadyExists = this.systemStorage.networks.find(
            (n) => n.chainId === network.chainId
        )
        if (networkAlreadyExists) {
            throw new Error(`Network ${network.chainId} already exists`)
        } else {
            this.systemStorage.networks.push(network)
        }
    }

    async removeNetwork(chainId: string): Promise<void> {
        this.assertConnected()
        this.systemStorage.networks = this.systemStorage.networks.filter(
            (n) => n.chainId !== chainId
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
}
