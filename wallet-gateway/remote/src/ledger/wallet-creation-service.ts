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
import { PartyHint } from '../user-api/rpc-gen/typings.js'

export interface SigningProviderContext {
    partyId: string
    externalTxId: string
    topologyTransactions: string
    namespace: string
}

export interface CreateWalletContext {
    networkId: string
    signingProviderId: string
    primary: boolean
}

function handleSigningError<T extends object>(result: SigningError | T): T {
    if ('error' in result) {
        throw new Error(
            `Error from signing driver: ${result.error_description}`
        )
    }
    return result
}

// Handles signing provider specific wallet creation logic
// TODO add interfaces of create / initialize / allocate and make each signing provider implement them

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
        ctx: CreateWalletContext
    ): Promise<Wallet> {
        return this.initializeParticipantWallet(userId, partyHint, ctx)
    }

    private async initializeParticipantWallet(
        userId: UserId,
        partyHint: PartyHint,
        ctx: CreateWalletContext
    ): Promise<Wallet> {
        const party = await this.partyAllocator.allocateParty(userId, partyHint)
        const partyId =
            party.partyId !== ''
                ? party.partyId
                : `${party.hint}::${party.namespace}`
        const wallet: Wallet = {
            partyId,
            hint: party.hint,
            namespace: party.namespace,
            signingProviderId: ctx.signingProviderId,
            networkId: ctx.networkId,
            status: 'allocated',
            primary: ctx.primary,
            publicKey: party.namespace,
            externalTxId: '',
            topologyTransactions: '',
        }
        await this.store.addWallet(wallet)
        return wallet
    }

    public async allocateParticipantParty(
        userId: UserId,
        existingWallet: Wallet,
        networkId: string
    ): Promise<Wallet> {
        const party = await this.partyAllocator.allocateParty(
            userId,
            existingWallet.hint
        )
        const partyId =
            party.partyId !== ''
                ? party.partyId
                : `${party.hint}::${party.namespace}`
        const wallet = {
            ...existingWallet,
            ...party,
            partyId,
            publicKey: party.namespace,
        } as Wallet
        await this.store.updateWallet({
            partyId: wallet.partyId,
            networkId,
            status: 'allocated',
            externalTxId: wallet.externalTxId ?? '',
        })
        return wallet
    }

    public async createWalletKernelWallet(
        userId: UserId,
        partyHint: PartyHint,
        ctx: CreateWalletContext
    ): Promise<Wallet> {
        return this.initializeWalletKernelWallet(userId, partyHint, ctx)
    }

    private async initializeWalletKernelWallet(
        userId: UserId,
        partyHint: PartyHint,
        ctx: CreateWalletContext
    ): Promise<Wallet> {
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
            publicKey
        )
        const partyId =
            party.partyId !== ''
                ? party.partyId
                : `${party.hint}::${party.namespace}`
        const wallet: Wallet = {
            partyId,
            hint: party.hint,
            namespace: party.namespace,
            signingProviderId: ctx.signingProviderId,
            networkId: ctx.networkId,
            status: 'allocated',
            primary: ctx.primary,
            publicKey,
            externalTxId: '',
            topologyTransactions: '',
        }
        await this.store.addWallet(wallet)
        return wallet
    }

    // TODO could I make it work more like fb and bd?
    public async allocateWalletKernelParty(
        userId: UserId,
        hint: string,
        publicKey: string
    ): Promise<AllocatedParty>
    public async allocateWalletKernelParty(
        userId: UserId,
        hint: string,
        publicKey: string,
        existingWallet: Wallet,
        networkId: string
    ): Promise<Wallet>
    public async allocateWalletKernelParty(
        userId: UserId,
        hint: string,
        publicKey: string,
        existingWallet?: Wallet,
        networkId?: string
    ): Promise<AllocatedParty | Wallet> {
        const signingProvider =
            this.signingDrivers[SigningProvider.WALLET_KERNEL]
        if (!signingProvider) {
            throw new Error('Wallet Kernel signing driver not available')
        }
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

        const party = await this.partyAllocator.allocateParty(
            userId,
            hint,
            publicKey,
            signingCallback
        )

        if (existingWallet !== undefined && networkId !== undefined) {
            const partyId =
                party.partyId !== ''
                    ? party.partyId
                    : `${party.hint}::${party.namespace}`
            const wallet = {
                ...existingWallet,
                ...party,
                partyId,
                publicKey,
            } as Wallet
            await this.store.updateWallet({
                partyId: wallet.partyId,
                networkId,
                status: 'allocated',
                externalTxId: wallet.externalTxId ?? '',
            })
            return wallet
        }

        return party
    }

    async createFireblocksWallet(
        userId: UserId,
        partyHint: PartyHint,
        ctx: CreateWalletContext
    ): Promise<Wallet> {
        this.logger.debug({ userId, partyHint }, 'createFireblocksWallet')
        return this.initializeFireblocksWallet(userId, partyHint, ctx)
    }

    private async initializeFireblocksWallet(
        userId: UserId,
        partyHint: PartyHint,
        ctx: CreateWalletContext
    ): Promise<Wallet> {
        this.logger.debug({ userId, partyHint }, 'initializeFireblocksWallet')
        const signingProvider = this.signingDrivers[SigningProvider.FIREBLOCKS]
        if (!signingProvider) {
            throw new Error('Fireblocks signing driver not available')
        }
        const driver = signingProvider.controller(userId)
        const keys = await driver.getKeys().then(handleSigningError)

        const key = keys?.keys?.find((k) => k.name === 'Canton Party')
        if (!key) throw new Error('Fireblocks key not found')

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

        let signature: string | undefined
        if (status === 'signed') {
            const txResult = await driver
                .getTransaction({
                    userId,
                    txId,
                })
                .then(handleSigningError)
            signature = txResult.signature
        }

        const { txStatus, hint } = {
            txStatus: status,
            hint: partyHint,
        }

        if (txStatus === 'signed' && signature) {
            const partyId =
                await this.partyAllocator.allocatePartyWithExistingWallet(
                    namespace,
                    topologyTransactions,
                    Buffer.from(signature, 'hex').toString('base64'),
                    userId
                )
            const wallet: Wallet = {
                partyId,
                hint,
                namespace,
                signingProviderId: ctx.signingProviderId,
                networkId: ctx.networkId,
                status: 'allocated',
                primary: ctx.primary,
                publicKey: key.publicKey,
                externalTxId: txId,
                topologyTransactions: topologyTransactions.join(', '),
            }
            await this.store.addWallet(wallet)
            return wallet
        }

        if (txStatus === 'failed' || txStatus === 'rejected') {
            const reason =
                txStatus === 'rejected'
                    ? 'transaction rejected'
                    : 'transaction failed'
            const wallet: Wallet = {
                partyId: `${hint}::${namespace}`,
                hint,
                namespace,
                signingProviderId: ctx.signingProviderId,
                networkId: ctx.networkId,
                status: 'removed',
                primary: ctx.primary,
                publicKey: key.publicKey,
                externalTxId: txId,
                topologyTransactions: topologyTransactions.join(', '),
                disabled: true,
                reason,
            }
            await this.store.addWallet(wallet)
            return wallet
        }

        const wallet: Wallet = {
            partyId: `${hint}::${namespace}`,
            hint,
            namespace,
            signingProviderId: ctx.signingProviderId,
            networkId: ctx.networkId,
            status: 'initialized',
            primary: ctx.primary,
            publicKey: key.publicKey,
            externalTxId: txId,
            topologyTransactions: topologyTransactions.join(', '),
        }
        await this.store.addWallet(wallet)
        return wallet
    }

    async allocateFireblocksParty(
        userId: UserId,
        signingProviderContext: SigningProviderContext,
        existingWallet: Wallet,
        networkId: string
    ): Promise<Wallet> {
        // this.logger.debug(
        //     { userId, partyHint, signingProviderContext },
        //     'allocateFireblocksParty'
        // )
        const signingProvider = this.signingDrivers[SigningProvider.FIREBLOCKS]
        if (!signingProvider) {
            throw new Error('Fireblocks signing driver not available')
        }
        const driver = signingProvider.controller(userId)

        const keys = await driver.getKeys().then(handleSigningError)

        const key = keys?.keys?.find((k) => k.name === 'Canton Party')
        if (!key) throw new Error('Fireblocks key not found')

        let walletStatus: WalletStatus = 'initialized'
        let reason: string | undefined
        const { signature, status } = await driver
            .getTransaction({
                userId,
                txId: signingProviderContext.externalTxId,
            })
            .then(handleSigningError)
        this.logger.debug({ signature, status }, 'getTransaction')
        if (status === 'failed' || status === 'rejected') {
            walletStatus = 'removed'
            reason =
                status === 'rejected'
                    ? 'transaction rejected'
                    : 'transaction failed'
        }

        if (signature && walletStatus !== 'removed') {
            await this.partyAllocator.allocatePartyWithExistingWallet(
                signingProviderContext.namespace,
                signingProviderContext.topologyTransactions.split(', '),
                Buffer.from(signature, 'hex').toString('base64'),
                userId
            )
            walletStatus = 'allocated'
        }

        const wallet = {
            ...existingWallet,
            partyId: signingProviderContext.partyId,
            namespace: signingProviderContext.namespace,
            publicKey: key.publicKey,
            status: walletStatus,
            ...(reason && { reason }),
        } as Wallet

        if (walletStatus === 'removed' && reason) {
            await this.store.updateWallet({
                partyId: existingWallet.partyId,
                networkId,
                status: 'removed',
                reason,
            })
        } else if (
            walletStatus === 'allocated' ||
            walletStatus === 'initialized'
        ) {
            await this.store.updateWallet({
                partyId: wallet.partyId,
                networkId,
                status: wallet.status,
                externalTxId: existingWallet.externalTxId ?? '',
            })
        }

        return wallet
    }

    async createBlockdaemonWallet(
        userId: UserId,
        partyHint: PartyHint,
        ctx: CreateWalletContext
    ): Promise<Wallet> {
        this.logger.debug({ userId, partyHint }, 'createBlockdaemonWallet')
        return this.initializeBlockdaemonWallet(userId, partyHint, ctx)
    }

    private async initializeBlockdaemonWallet(
        userId: UserId,
        partyHint: PartyHint,
        ctx: CreateWalletContext
    ): Promise<Wallet> {
        this.logger.debug({ userId, partyHint }, 'initializeBlockdaemonWallet')
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

        let signature: string | undefined
        if (status === 'signed') {
            const txResult = await driver
                .getTransaction({
                    userId,
                    txId,
                })
                .then(handleSigningError)
            signature = txResult.signature
        }

        const { txStatus, hint } = { txStatus: status, hint: partyHint }

        if (txStatus === 'signed' && signature) {
            const partyId =
                await this.partyAllocator.allocatePartyWithExistingWallet(
                    namespace,
                    topologyTransactions,
                    signature,
                    userId
                )
            const wallet: Wallet = {
                partyId,
                hint,
                namespace,
                signingProviderId: ctx.signingProviderId,
                networkId: ctx.networkId,
                status: 'allocated',
                primary: ctx.primary,
                publicKey: key.publicKey,
                externalTxId: txId,
                topologyTransactions: topologyTransactions.join(', '),
            }
            await this.store.addWallet(wallet)
            return wallet
        }

        if (txStatus === 'failed' || txStatus === 'rejected') {
            const reason =
                txStatus === 'rejected'
                    ? 'transaction rejected'
                    : 'transaction failed'
            const wallet: Wallet = {
                partyId: `${hint}::${namespace}`,
                hint,
                namespace,
                signingProviderId: ctx.signingProviderId,
                networkId: ctx.networkId,
                status: 'removed',
                primary: ctx.primary,
                publicKey: key.publicKey,
                externalTxId: txId,
                topologyTransactions: topologyTransactions.join(', '),
                reason,
            }
            await this.store.addWallet(wallet)
            return wallet
        }

        const wallet: Wallet = {
            partyId: `${hint}::${namespace}`,
            hint,
            namespace,
            signingProviderId: ctx.signingProviderId,
            networkId: ctx.networkId,
            status: 'initialized',
            primary: ctx.primary,
            publicKey: key.publicKey,
            externalTxId: txId,
            topologyTransactions: topologyTransactions.join(', '),
        }
        await this.store.addWallet(wallet)
        return wallet
    }

    async allocateBlockdaemonParty(
        userId: UserId,
        signingProviderContext: SigningProviderContext,
        existingWallet: Wallet,
        networkId: string
    ): Promise<Wallet> {
        // this.logger.debug(
        //     { userId, partyHint, signingProviderContext },
        //     'allocateBlockdaemonParty'
        // )
        const signingProvider = this.signingDrivers[SigningProvider.BLOCKDAEMON]
        if (!signingProvider) {
            throw new Error('Blockdaemon signing driver not available')
        }
        const driver = signingProvider.controller(userId)

        let walletStatus: WalletStatus = 'initialized'
        let reason: string | undefined
        const { signature, status } = await driver
            .getTransaction({
                userId,
                txId: signingProviderContext.externalTxId,
            })
            .then(handleSigningError)
        this.logger.debug({ signature, status }, 'getTransaction')
        if (status === 'failed' || status === 'rejected') {
            walletStatus = 'removed'
            reason =
                status === 'rejected'
                    ? 'transaction rejected'
                    : 'transaction failed'
        }

        if (signature && walletStatus !== 'removed') {
            await this.partyAllocator.allocatePartyWithExistingWallet(
                signingProviderContext.namespace,
                signingProviderContext.topologyTransactions.split(', '),
                signature,
                userId
            )
            walletStatus = 'allocated'
        }

        const wallet = {
            ...existingWallet,
            partyId: signingProviderContext.partyId,
            namespace: signingProviderContext.namespace,
            status: walletStatus,
            ...(reason && { reason }),
        } as Wallet

        if (walletStatus === 'removed' && reason) {
            await this.store.updateWallet({
                partyId: existingWallet.partyId,
                networkId,
                status: 'removed',
                reason,
            })
        } else if (
            walletStatus === 'allocated' ||
            walletStatus === 'initialized'
        ) {
            await this.store.updateWallet({
                partyId: wallet.partyId,
                networkId,
                status: wallet.status,
                externalTxId: existingWallet.externalTxId ?? '',
            })
        }

        return wallet
    }
}
