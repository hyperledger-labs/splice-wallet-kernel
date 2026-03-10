// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { UserId } from '@canton-network/core-wallet-auth'
import { Store, UpdateWallet, Wallet } from '@canton-network/core-wallet-store'
import {
    Error as SigningError,
    SigningDriverInterface,
    SigningProvider,
} from '@canton-network/core-signing-lib'
import { Logger } from 'pino'
import { PartyAllocationService } from './party-allocation-service.js'
import { PartyHint, Primary } from '../user-api/rpc-gen/typings.js'
import { WALLET_DISABLED_REASON } from '../constants.js'

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
        primary: Primary = false
    ): Promise<Wallet> {
        return this.initializeWalletKernelWallet(userId, partyHint, primary)
    }

    private async initializeWalletKernelWallet(
        userId: UserId,
        partyHint: PartyHint,
        primary: Primary = false
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

        const party = await this.partyAllocator.allocateParty(
            userId,
            partyHint,
            key.publicKey,
            async (hash) => {
                const { signature } = await driver
                    .signTransaction({
                        tx: '',
                        txHash: hash,
                        keyIdentifier: {
                            publicKey: key.publicKey,
                        },
                    })
                    .then(handleSigningError)

                if (!signature) {
                    throw new Error('No signature returned from signing driver')
                }

                return signature
            }
        )

        const network = await this.store.getCurrentNetwork()
        const wallet: Wallet = {
            partyId: party.partyId,
            hint: party.hint,
            namespace: party.namespace,
            signingProviderId: SigningProvider.WALLET_KERNEL,
            networkId: network.networkId,
            status: 'allocated',
            primary,
            publicKey: key.publicKey,
            externalTxId: '',
            topologyTransactions: '',
        }
        await this.store.addWallet(wallet)
        return wallet
    }

    public async allocateWalletKernelParty(
        userId: UserId,
        existingWallet: Wallet
    ): Promise<void> {
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
                    keyIdentifier: { publicKey: existingWallet.publicKey },
                })
                .then(handleSigningError)

            if (!result.signature) {
                throw new Error('No signature returned from signing driver')
            }
            return result.signature
        }

        const party = await this.partyAllocator.allocateParty(
            userId,
            existingWallet.hint,
            existingWallet.publicKey,
            signingCallback
        )

        const { networkId } = await this.store.getCurrentNetwork()
        const updateWallet: UpdateWallet = {
            networkId,
            partyId: party.partyId,
            status: 'allocated',
        }

        return await this.store.updateWallet(updateWallet)
    }

    async createFireblocksWallet(
        userId: UserId,
        partyHint: PartyHint,
        primary: Primary = false
    ): Promise<Wallet> {
        this.logger.debug({ userId, partyHint }, 'createFireblocksWallet')
        return this.initializeFireblocksWallet(userId, partyHint, primary)
    }

    private async initializeFireblocksWallet(
        userId: UserId,
        partyHint: PartyHint,
        primary: Primary = false
    ): Promise<Wallet> {
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
        const topologyTransactions = transactions.topologyTransactions ?? []

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

        const network = await this.store.getCurrentNetwork()
        const walletBase: Omit<Wallet, 'status'> = {
            partyId: `${partyHint}::${namespace}`,
            hint: partyHint,
            namespace,
            signingProviderId: SigningProvider.FIREBLOCKS,
            networkId: network,
            primary,
            publicKey: key.publicKey,
            externalTxId: txId,
            topologyTransactions: topologyTransactions.join(', '),
        }
        let wallet: Wallet

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
            const partyId =
                await this.partyAllocator.allocatePartyWithExistingWallet(
                    namespace,
                    topologyTransactions,
                    Buffer.from(signature, 'hex').toString('base64'),
                    userId
                )
            wallet = {
                ...walletBase,
                partyId,
                status: 'allocated',
            }
        } else if (status === 'pending') {
            wallet = {
                ...walletBase,
                status: 'initialized',
            }
        } else {
            const reason =
                status === 'rejected'
                    ? WALLET_DISABLED_REASON.TRANSACTION_REJECTED
                    : WALLET_DISABLED_REASON.TRANSACTION_FAILED
            wallet = {
                ...walletBase,
                status: 'removed',
                disabled: true,
                reason,
            }
        }

        await this.store.addWallet(wallet)
        return wallet
    }

    async allocateFireblocksParty(
        userId: UserId,
        existingWallet: Wallet
    ): Promise<void> {
        if (
            !existingWallet.externalTxId ||
            !existingWallet.topologyTransactions
        ) {
            throw new Error(
                'Existing wallet is missing field externalTxId or topologyTransactions'
            )
        }

        const signingProvider = this.signingDrivers[SigningProvider.FIREBLOCKS]
        if (!signingProvider) {
            throw new Error('Fireblocks signing driver not available')
        }

        const driver = signingProvider.controller(userId)
        const keys = await driver.getKeys().then(handleSigningError)
        const key = keys?.keys?.find((k) => k.name === 'Canton Party')
        if (!key) throw new Error('Fireblocks key not found')

        const { signature, status } = await driver
            .getTransaction({
                userId,
                txId: existingWallet.externalTxId,
            })
            .then(handleSigningError)

        let walletUpdate: UpdateWallet = {
            partyId: existingWallet.partyId,
            networkId: existingWallet.networkId,
        }
        if (status === 'signed') {
            if (!signature) {
                throw new Error(
                    'Transaction signed but no signature found in result'
                )
            }
            const partyId =
                await this.partyAllocator.allocatePartyWithExistingWallet(
                    existingWallet.namespace,
                    existingWallet.topologyTransactions.split(', '),
                    Buffer.from(signature, 'hex').toString('base64'),
                    userId
                )
            walletUpdate = {
                ...walletUpdate,
                partyId,
                status: 'allocated',
            }
        } else if (status === 'pending') {
            walletUpdate = {
                ...walletUpdate,
                status: 'initialized',
            }
        } else {
            const reason =
                status === 'rejected'
                    ? WALLET_DISABLED_REASON.TRANSACTION_REJECTED
                    : WALLET_DISABLED_REASON.TRANSACTION_FAILED
            walletUpdate = {
                ...walletUpdate,
                status: 'removed',
                disabled: true,
                reason,
            }
        }

        return this.store.updateWallet(walletUpdate)
    }

    async createBlockdaemonWallet(
        userId: UserId,
        partyHint: PartyHint,
        primary: Primary = false
    ): Promise<Wallet> {
        this.logger.debug({ userId, partyHint }, 'createBlockdaemonWallet')
        return this.initializeBlockdaemonWallet(userId, partyHint, primary)
    }

    private async initializeBlockdaemonWallet(
        userId: UserId,
        partyHint: PartyHint,
        primary: Primary = false
    ): Promise<Wallet> {
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

        const network = await this.store.getCurrentNetwork()
        const walletBase: Omit<Wallet, 'status'> = {
            partyId: `${partyHint}::${namespace}`,
            hint: partyHint,
            namespace,
            signingProviderId: SigningProvider.BLOCKDAEMON,
            networkId: network.networkId,
            primary,
            publicKey: key.publicKey,
            externalTxId: txId,
            topologyTransactions: topologyTransactions.join(', '),
        }
        let wallet: Wallet

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
            const partyId =
                await this.partyAllocator.allocatePartyWithExistingWallet(
                    namespace,
                    topologyTransactions,
                    signature,
                    userId
                )
            wallet = {
                ...walletBase,
                partyId,
                status: 'allocated',
            }
        } else if (status === 'pending') {
            wallet = {
                ...walletBase,
                status: 'initialized',
            }
        } else {
            const reason =
                status === 'rejected'
                    ? WALLET_DISABLED_REASON.TRANSACTION_REJECTED
                    : WALLET_DISABLED_REASON.TRANSACTION_FAILED
            wallet = {
                ...walletBase,
                status: 'removed',
                disabled: true,
                reason,
            }
        }

        await this.store.addWallet(wallet)
        return wallet
    }

    async allocateBlockdaemonParty(
        userId: UserId,
        existingWallet: Wallet
    ): Promise<void> {
        if (
            !existingWallet.externalTxId ||
            !existingWallet.topologyTransactions
        ) {
            throw new Error(
                'Existing wallet is missing field externalTxId or topologyTransactions'
            )
        }
        const signingProvider = this.signingDrivers[SigningProvider.BLOCKDAEMON]
        if (!signingProvider) {
            throw new Error('Blockdaemon signing driver not available')
        }
        const driver = signingProvider.controller(userId)

        const { signature, status } = await driver
            .getTransaction({
                userId,
                txId: existingWallet.externalTxId,
            })
            .then(handleSigningError)

        let walletUpdate: UpdateWallet = {
            partyId: existingWallet.partyId,
            networkId: existingWallet.networkId,
        }
        if (status === 'signed') {
            if (!signature) {
                throw new Error(
                    'Transaction signed but no signature found in result'
                )
            }
            const partyId =
                await this.partyAllocator.allocatePartyWithExistingWallet(
                    existingWallet.namespace,
                    existingWallet.topologyTransactions.split(', '),
                    signature,
                    userId
                )
            walletUpdate = {
                ...walletUpdate,
                partyId,
                status: 'allocated',
            }
        } else if (status === 'pending') {
            walletUpdate = {
                ...walletUpdate,
                status: 'initialized',
            }
        } else {
            const reason =
                status === 'rejected'
                    ? WALLET_DISABLED_REASON.TRANSACTION_REJECTED
                    : WALLET_DISABLED_REASON.TRANSACTION_FAILED
            walletUpdate = {
                ...walletUpdate,
                status: 'removed',
                disabled: true,
                reason,
            }
        }

        return this.store.updateWallet(walletUpdate)
    }
}
