// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { UserId } from '@canton-network/core-wallet-auth'
import { Store, Wallet, WalletStatus } from '@canton-network/core-wallet-store'
import {
    Error as SigningError,
    SigningDriverInterface,
    SigningProvider,
} from '@canton-network/core-signing-lib'
import { Logger } from 'pino'
import {
    AllocatedParty,
    PartyAllocationService,
} from './party-allocation-service.js'
import {
    PartyHint,
    SigningProviderContext,
} from '../user-api/rpc-gen/typings.js'

function handleSigningError<T extends object>(result: SigningError | T): T {
    if ('error' in result) {
        throw new Error(
            `Error from signing driver: ${result.error_description}`
        )
    }
    return result
}

export class WalletCreationService {
    constructor(
        private store: Store,
        private logger: Logger,
        private partyAllocator: PartyAllocationService,
        private signingDrivers: Partial<
            Record<SigningProvider, SigningDriverInterface>
        > = {}
    ) {}

    public async createParticipantWallet(
        userId: UserId,
        partyHint: PartyHint,
        signingProviderContext?: SigningProviderContext
    ): Promise<AllocatedParty> {
        if (signingProviderContext) {
            const wallets = await this.store.getWallets()
            const existingWallet = wallets.find(
                (w) => w.partyId === signingProviderContext.partyId
            )
            if (!existingWallet) {
                throw new Error(
                    `Wallet not found for party ${signingProviderContext.partyId}`
                )
            }
            return this.reallocateParticipantWallet(userId, existingWallet)
        }
        return this.partyAllocator.allocateParty(userId, partyHint)
    }

    public reallocateParticipantWallet(userId: UserId, wallet: Wallet) {
        return this.partyAllocator.allocateParty(userId, wallet.hint)
    }

    public async createWalletKernelWallet(
        userId: UserId,
        partyHint: PartyHint,
        signingProviderContext?: SigningProviderContext
    ): Promise<{ party: AllocatedParty; publicKey: string }> {
        if (signingProviderContext) {
            const wallets = await this.store.getWallets()
            const existingWallet = wallets.find(
                (w) => w.partyId === signingProviderContext.partyId
            )
            if (!existingWallet) {
                throw new Error(
                    `Wallet not found for party ${signingProviderContext.partyId}`
                )
            }
            const party = await this.reallocateWalletKernelWallet(
                userId,
                existingWallet
            )
            return {
                party,
                publicKey: existingWallet.publicKey,
            }
        }
        return this.initializeWalletKernelWallet(userId, partyHint)
    }

    private async initializeWalletKernelWallet(
        userId: UserId,
        partyHint: PartyHint
    ): Promise<{ party: AllocatedParty; publicKey: string }> {
        const signingProvider =
            this.signingDrivers[SigningProvider.WALLET_KERNEL]
        if (!signingProvider) {
            throw new Error('Wallet Kernel signing driver not available')
        }
        const driver = signingProvider.controller(userId)
        const key = await driver
            .createKey({
                name: partyHint,
            })
            .then(handleSigningError)
        const publicKey = key.publicKey

        const party = await this.allocateWalletKernelParty(
            userId,
            partyHint,
            publicKey,
            signingProvider
        )
        return {
            party,
            publicKey,
        }
    }

    public reallocateWalletKernelWallet(
        userId: UserId,
        wallet: Wallet
    ): Promise<AllocatedParty> {
        const signingProvider =
            this.signingDrivers[SigningProvider.WALLET_KERNEL]
        if (!signingProvider) {
            throw new Error('Wallet Kernel signing driver not available')
        }
        return this.allocateWalletKernelParty(
            userId,
            wallet.hint,
            wallet.publicKey,
            signingProvider
        )
    }

    private async allocateWalletKernelParty(
        userId: UserId,
        hint: string,
        publicKey: string,
        signingProvider: SigningDriverInterface
    ): Promise<AllocatedParty> {
        const driver = signingProvider.controller(userId)
        const signingCallback = async (hash: string) => {
            const result = await driver
                .signTransaction({
                    tx: '',
                    txHash: hash,
                    keyIdentifier: { publicKey },
                })
                .then(handleSigningError)

            if (!result.signature) {
                throw new Error('No signature returned from signing driver')
            }
            return result.signature
        }

        return await this.partyAllocator.allocateParty(
            userId,
            hint,
            publicKey,
            signingCallback
        )
    }

    async createFireblocksWallet(
        userId: UserId,
        partyHint: PartyHint,
        signingProviderContext?: SigningProviderContext
    ): Promise<{
        txId: string
        walletStatus: WalletStatus
        party: AllocatedParty
        publicKey: string
        topologyTransactions: string[]
    }> {
        this.logger.debug(
            { userId, partyHint, signingProviderContext },
            'createFireblocksWallet'
        )
        const signingProvider = this.signingDrivers[SigningProvider.FIREBLOCKS]
        if (!signingProvider) {
            throw new Error('Fireblocks signing driver not available')
        }
        let party, walletStatus, topologyTransactions, txId, publicKey

        if (signingProviderContext) {
            const allocateResult = await this.allocateFireblocksParty(
                userId,
                partyHint,
                signingProviderContext
            )
            walletStatus = allocateResult.walletStatus
            party = allocateResult.party
            txId = signingProviderContext.externalTxId
            topologyTransactions =
                signingProviderContext.topologyTransactions.split(', ')
            publicKey = allocateResult.publicKey
        } else {
            const initializeResult = await this.initializeFireblocksWallet(
                userId,
                partyHint
            )
            walletStatus = initializeResult.walletStatus
            party = initializeResult.party
            txId = initializeResult.txId
            topologyTransactions = initializeResult.topologyTransactions
            publicKey = initializeResult.publicKey
        }

        return {
            txId,
            walletStatus,
            party,
            publicKey,
            topologyTransactions,
        }
    }

    async allocateFireblocksParty(
        userId: UserId,
        partyHint: PartyHint,
        signingProviderContext: SigningProviderContext
    ): Promise<{
        walletStatus: WalletStatus
        party: AllocatedParty
        publicKey: string
    }> {
        this.logger.debug(
            { userId, partyHint, signingProviderContext },
            'allocateFireblocksParty'
        )
        const signingProvider = this.signingDrivers[SigningProvider.FIREBLOCKS]
        if (!signingProvider) {
            throw new Error('Fireblocks signing driver not available')
        }
        const driver = signingProvider.controller(userId)

        const keys = await driver.getKeys().then(handleSigningError)

        const key = keys?.keys?.find((k) => k.name === 'Canton Party')
        if (!key) throw new Error('Fireblocks key not found')

        let walletStatus: WalletStatus = 'initialized'
        const { signature, status } = await driver
            .getTransaction({
                userId,
                txId: signingProviderContext.externalTxId,
            })
            .then(handleSigningError)
        this.logger.debug({ signature, status }, 'getTransaction')
        if (!['pending', 'signed'].includes(status)) {
            await this.store.removeWallet(signingProviderContext.partyId)
        }

        if (signature) {
            await this.partyAllocator.allocatePartyWithExistingWallet(
                signingProviderContext.namespace,
                signingProviderContext.topologyTransactions.split(', '),
                Buffer.from(signature, 'hex').toString('base64'),
                userId
            )
            walletStatus = 'allocated'
        }
        const party = {
            partyId: signingProviderContext.partyId,
            namespace: signingProviderContext.namespace,
            hint: partyHint,
        }

        const publicKey = key.publicKey
        return {
            walletStatus,
            party,
            publicKey,
        }
    }

    async initializeFireblocksWallet(
        userId: UserId,
        partyHint: PartyHint
    ): Promise<{
        txId: string
        walletStatus: WalletStatus
        party: AllocatedParty
        publicKey: string
        topologyTransactions: string[]
    }> {
        this.logger.debug({ userId, partyHint }, 'initializeFireblocksWallet')
        const signingProvider = this.signingDrivers[SigningProvider.FIREBLOCKS]
        if (!signingProvider) {
            throw new Error('Fireblocks signing driver not available')
        }
        const driver = signingProvider.controller(userId)
        const keys = await driver.getKeys().then(handleSigningError)

        const key = keys?.keys?.find((k) => k.name === 'Canton Party')
        if (!key) throw new Error('Fireblocks key not found')

        let walletStatus: WalletStatus = 'allocated'
        const formattedPublicKey = Buffer.from(key.publicKey, 'hex').toString(
            'base64'
        )
        const namespace =
            this.partyAllocator.createFingerprintFromKey(formattedPublicKey)
        const transactions =
            await this.partyAllocator.generateTopologyTransactions(
                partyHint,
                formattedPublicKey
            )
        const topologyTransactions = transactions.topologyTransactions!
        let partyId = ''

        const { status, txId } = await driver
            .signTransaction({
                tx: '',
                txHash: Buffer.from(transactions.multiHash, 'base64').toString(
                    'hex'
                ),
                keyIdentifier: {
                    publicKey: key.publicKey,
                },
            })
            .then(handleSigningError)
        if (status === 'signed') {
            const { signature } = await driver
                .getTransaction({
                    userId,
                    txId,
                })
                .then(handleSigningError)

            if (!signature) {
                throw new Error(
                    'Transaction signed but no signature found in result'
                )
            }

            partyId = await this.partyAllocator.allocatePartyWithExistingWallet(
                namespace,
                topologyTransactions,
                Buffer.from(signature, 'hex').toString('base64'),
                userId
            )
        } else {
            walletStatus = 'initialized'
        }

        const party = {
            partyId,
            namespace,
            hint: partyHint,
        }

        const publicKey = key.publicKey
        return {
            txId,
            walletStatus,
            party,
            publicKey,
            topologyTransactions,
        }
    }

    async createBlockdaemonWallet(
        userId: UserId,
        partyHint: PartyHint,
        signingProviderContext?: SigningProviderContext
    ): Promise<{
        txId: string
        walletStatus: WalletStatus
        party: AllocatedParty
        publicKey: string | undefined
        topologyTransactions: string[]
    }> {
        this.logger.debug(
            { userId, partyHint, signingProviderContext },
            'createBlockdaemonWallet'
        )
        const signingProvider = this.signingDrivers[SigningProvider.BLOCKDAEMON]
        if (!signingProvider) {
            throw new Error('Blockdaemon signing driver not available')
        }
        let party, walletStatus, topologyTransactions, txId, publicKey

        if (signingProviderContext) {
            const allocateResult = await this.allocateBlockdaemonParty(
                userId,
                partyHint,
                signingProviderContext
            )
            walletStatus = allocateResult.walletStatus
            party = allocateResult.party
            txId = signingProviderContext.externalTxId
            topologyTransactions =
                signingProviderContext.topologyTransactions.split(', ')
        } else {
            const initializeResult = await this.initializeBlockdaemonWallet(
                userId,
                partyHint
            )
            walletStatus = initializeResult.walletStatus
            party = initializeResult.party
            txId = initializeResult.txId
            topologyTransactions = initializeResult.topologyTransactions
            publicKey = initializeResult.publicKey
        }

        return {
            txId,
            walletStatus,
            party,
            publicKey,
            topologyTransactions,
        }
    }

    async allocateBlockdaemonParty(
        userId: UserId,
        partyHint: PartyHint,
        signingProviderContext: SigningProviderContext
    ): Promise<{
        walletStatus: WalletStatus
        party: AllocatedParty
    }> {
        this.logger.debug(
            { userId, partyHint, signingProviderContext },
            'allocateBlockdaemonParty'
        )
        const signingProvider = this.signingDrivers[SigningProvider.BLOCKDAEMON]
        if (!signingProvider) {
            throw new Error('Blockdaemon signing driver not available')
        }
        const driver = signingProvider.controller(userId)

        let walletStatus: WalletStatus = 'initialized'
        const { signature, status } = await driver
            .getTransaction({
                userId,
                txId: signingProviderContext.externalTxId,
            })
            .then(handleSigningError)
        // TODO remove
        this.logger.debug({ signature, status }, 'getTransaction')
        if (!['pending', 'signed'].includes(status)) {
            // await this.store.removeWallet(signingProviderContext.partyId)
        }

        if (signature) {
            await this.partyAllocator.allocatePartyWithExistingWallet(
                signingProviderContext.namespace,
                signingProviderContext.topologyTransactions.split(', '),
                signature,
                userId
            )
            walletStatus = 'allocated'
        }
        const party = {
            partyId: signingProviderContext.partyId,
            namespace: signingProviderContext.namespace,
            hint: partyHint,
        }

        return {
            walletStatus,
            party,
        }
    }

    async initializeBlockdaemonWallet(
        userId: UserId,
        partyHint: PartyHint
    ): Promise<{
        txId: string
        walletStatus: WalletStatus
        party: AllocatedParty
        publicKey: string
        topologyTransactions: string[]
    }> {
        this.logger.debug({ userId, partyHint }, 'initializeBlockdameonWallet')
        const signingProvider = this.signingDrivers[SigningProvider.BLOCKDAEMON]
        if (!signingProvider) {
            throw new Error('Blockdaemon signing driver not available')
        }
        const driver = signingProvider.controller(userId)

        const key = await driver.createKey({
            name: partyHint,
        })
        if ('error' in key) {
            throw new Error(`Failed to create key: ${key.error_description}`)
        }

        let walletStatus: WalletStatus = 'allocated'
        const namespace = this.partyAllocator.createFingerprintFromKey(
            key.publicKey
        )
        const transactions =
            await this.partyAllocator.generateTopologyTransactions(
                partyHint,
                key.publicKey
            )
        const topologyTransactions = transactions.topologyTransactions ?? []
        topologyTransactions.forEach((tx, idx) => {
            this.logger.info(
                `BLOCKDAEMON: topologyTransaction[${idx}] length=${tx.length} preview=${tx.substring(0, 100)}...`
            )
        })
        let partyId = ''

        const internalTxId = crypto
            .randomUUID()
            .replace(/-/g, '')
            .substring(0, 16)
        const txPayload = JSON.stringify(topologyTransactions)

        const { status, txId } = await driver
            .signTransaction({
                tx: Buffer.from(txPayload).toString('base64'),
                txHash: transactions.multiHash,
                keyIdentifier: {
                    publicKey: key.publicKey,
                },
                internalTxId,
            })
            .then(handleSigningError)

        if (status === 'signed') {
            const { signature } = await driver
                .getTransaction({
                    userId,
                    txId,
                })
                .then(handleSigningError)

            if (!signature) {
                throw new Error(
                    'Transaction signed but no signature found in result'
                )
            }

            partyId = await this.partyAllocator.allocatePartyWithExistingWallet(
                namespace,
                transactions.topologyTransactions ?? [],
                signature,
                userId
            )
        } else {
            walletStatus = 'initialized'
        }

        const party = {
            partyId,
            namespace,
            hint: partyHint,
        }
        const publicKey = key.publicKey

        return {
            txId,
            walletStatus,
            party,
            publicKey,
            topologyTransactions,
        }
    }
}
