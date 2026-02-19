// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { UserId } from '@canton-network/core-wallet-auth'
import { Store } from '@canton-network/core-wallet-store'
import {
    Error as SigningError,
    SigningDriverInterface,
} from '@canton-network/core-signing-lib'
import { Logger } from 'pino'
import { PartyAllocationService } from './party-allocation-service.js'
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
        private partyAllocator: PartyAllocationService
    ) {}

    createParticipantWallet(userId: UserId, partyHint: PartyHint) {
        return this.partyAllocator.allocateParty(userId, partyHint)
    }
    async createWalletKernelWallet(
        userId: UserId,
        partyHint: PartyHint,
        signingProvider: SigningDriverInterface
    ) {
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
        const publicKey = key.publicKey
        return {
            party,
            publicKey,
        }
    }
    async createFireblocksWallet(
        userId: UserId,
        partyHint: PartyHint,
        signingProvider: SigningDriverInterface,
        signingProviderContext?: SigningProviderContext
    ) {
        const driver = signingProvider.controller(userId)
        let party, walletStatus, topologyTransactions, txId
        const keys = await driver.getKeys().then(handleSigningError)

        const key = keys?.keys?.find((k) => k.name === 'Canton Party')
        if (!key) throw new Error('Fireblocks key not found')

        if (signingProviderContext) {
            walletStatus = 'initialized'
            const { signature, status } = await driver
                .getTransaction({
                    userId,
                    txId: signingProviderContext.externalTxId,
                })
                .then(handleSigningError)

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
            party = {
                partyId: signingProviderContext.partyId,
                namespace: signingProviderContext.namespace,
                hint: partyHint,
            }
        } else {
            const formattedPublicKey = Buffer.from(
                key.publicKey,
                'hex'
            ).toString('base64')
            const namespace =
                this.partyAllocator.createFingerprintFromKey(formattedPublicKey)
            const transactions =
                await this.partyAllocator.generateTopologyTransactions(
                    partyHint,
                    formattedPublicKey
                )
            topologyTransactions = transactions.topologyTransactions!
            let partyId = ''

            const { status, txId: id } = await driver
                .signTransaction({
                    tx: '',
                    txHash: Buffer.from(
                        transactions.multiHash,
                        'base64'
                    ).toString('hex'),
                    keyIdentifier: {
                        publicKey: key.publicKey,
                    },
                })
                .then(handleSigningError)
            if (status === 'signed') {
                const { signature } = await driver
                    .getTransaction({
                        userId,
                        txId: id,
                    })
                    .then(handleSigningError)

                if (!signature) {
                    throw new Error(
                        'Transaction signed but no signature found in result'
                    )
                }

                partyId =
                    await this.partyAllocator.allocatePartyWithExistingWallet(
                        namespace,
                        transactions.topologyTransactions!,
                        Buffer.from(signature, 'hex').toString('base64'),
                        userId
                    )
            } else {
                txId = id
                walletStatus = 'initialized'
            }

            party = {
                partyId,
                namespace,
                hint: partyHint,
            }
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
        signingProvider: SigningDriverInterface,
        signingProviderContext?: SigningProviderContext
    ) {
        const driver = signingProvider.controller(userId)
        let party, walletStatus, topologyTransactions, txId, publicKey
        if (signingProviderContext?.externalTxId) {
            walletStatus = 'initialized'
            const { signature, status } = await driver
                .getTransaction({
                    userId,
                    txId: signingProviderContext.externalTxId,
                })
                .then(handleSigningError)

            if (!['pending', 'signed'].includes(status)) {
                await this.store.removeWallet(signingProviderContext.partyId)
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
            party = {
                partyId: signingProviderContext.partyId,
                namespace: signingProviderContext.namespace,
                hint: partyHint,
            }
        } else {
            const key = await driver.createKey({
                name: partyHint,
            })
            if ('error' in key) {
                throw new Error(
                    `Failed to create key: ${key.error_description}`
                )
            }

            const namespace = this.partyAllocator.createFingerprintFromKey(
                key.publicKey
            )

            const transactions =
                await this.partyAllocator.generateTopologyTransactions(
                    partyHint,
                    key.publicKey
                )
            topologyTransactions = transactions.topologyTransactions ?? []
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

            const { status, txId: id } = await driver
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
                        txId: id,
                    })
                    .then(handleSigningError)

                if (!signature) {
                    throw new Error(
                        'Transaction signed but no signature found in result'
                    )
                }

                partyId =
                    await this.partyAllocator.allocatePartyWithExistingWallet(
                        namespace,
                        transactions.topologyTransactions ?? [],
                        signature,
                        userId
                    )
            } else {
                txId = id
                walletStatus = 'initialized'
            }

            party = {
                partyId,
                namespace,
                hint: partyHint,
            }
            publicKey = key.publicKey
        }
        return {
            txId,
            walletStatus,
            party,
            publicKey,
            topologyTransactions,
        }
    }
}
