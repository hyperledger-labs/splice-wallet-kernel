// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Logger } from 'pino'
import { LedgerClient } from '@canton-network/core-ledger-client'
import {
    Store,
    Transaction,
    Wallet,
    Network,
} from '@canton-network/core-wallet-store'
import type { SignResult } from '../user-api/rpc-gen/typings.js'
import {
    Error as SigningError,
    GetTransactionResult,
    SigningDriverInterface,
    SigningProvider,
    SignTransactionResult,
} from '@canton-network/core-signing-lib'
import {
    ExecuteParams,
    ExecuteResult,
    SignParams,
    SignResultSigned,
} from '../user-api/rpc-gen/typings.js'
import { UserId } from '../dapp-api/rpc-gen/typings.js'
import { Notifier } from '../notification/NotificationService.js'
import { ledgerPrepareParams, type PrepareParams } from '../utils.js'

function handleSigningError<T extends object>(result: SigningError | T): T {
    if ('error' in result) {
        throw new Error(
            `Error from signing driver: ${result.error_description}`
        )
    }
    return result
}

export class TransactionService {
    constructor(
        private store: Store,
        private logger: Logger,
        private signingDrivers: Partial<
            Record<SigningProvider, SigningDriverInterface>
        > = {},
        private notifier: Notifier
    ) {}

    public signWithParticipant(wallet: Wallet): SignResultSigned {
        return {
            status: 'signed',
            signature: 'none',
            signedBy: wallet.namespace,
            partyId: wallet.partyId,
        }
    }

    public async signWithWalletKernel(
        userId: UserId,
        wallet: Wallet,
        signParams: SignParams
    ): Promise<SignResultSigned> {
        const signingProvider =
            this.signingDrivers[SigningProvider.WALLET_KERNEL]
        if (!signingProvider) {
            throw new Error('Wallet Kernel signing driver not available')
        }
        const driver = signingProvider.controller(userId)

        const { preparedTransaction, preparedTransactionHash, commandId } =
            signParams
        const { signature } = await driver
            .signTransaction({
                tx: preparedTransaction,
                txHash: preparedTransactionHash,
                keyIdentifier: {
                    publicKey: wallet.publicKey,
                },
            })
            .then(handleSigningError)

        if (!signature) {
            throw new Error(
                'Failed to sign transaction: ' + JSON.stringify(signature)
            )
        }

        const existingTx = await this.store.getTransaction(commandId)
        const now = new Date()

        const signedTx: Transaction = {
            commandId,
            status: 'signed',
            preparedTransaction,
            preparedTransactionHash,
            origin: existingTx?.origin ?? null,
            ...(existingTx?.createdAt && {
                createdAt: existingTx.createdAt,
            }),
            signedAt: now,
        }

        this.store.setTransaction(signedTx)
        this.notifier.emit('txChanged', signedTx)

        return {
            status: 'signed',
            signature,
            signedBy: wallet.namespace,
            partyId: wallet.partyId,
        }
    }

    public async signWithBlockdaemon(
        userId: UserId,
        wallet: Wallet,
        signParams: SignParams
    ): Promise<SignResult> {
        const signingProvider = this.signingDrivers[SigningProvider.BLOCKDAEMON]
        if (!signingProvider) {
            throw new Error('Blockdaemon signing driver not available')
        }
        const driver = signingProvider.controller(userId)

        const { preparedTransaction, preparedTransactionHash, commandId } =
            signParams

        let signingResult: Exclude<
            GetTransactionResult | SignTransactionResult,
            SigningError
        >
        const existingTx = await this.store.getTransaction(commandId)
        if (existingTx && existingTx.externalTxId) {
            signingResult = await driver
                .getTransaction({
                    userId,
                    txId: existingTx.externalTxId,
                })
                .then(handleSigningError)
        } else {
            const internalTxId = crypto
                .randomUUID()
                .replace(/-/g, '')
                .substring(0, 16)
            signingResult = await driver
                .signTransaction({
                    tx: preparedTransaction,
                    txHash: preparedTransactionHash,
                    keyIdentifier: {
                        publicKey: wallet.publicKey,
                    },
                    internalTxId,
                })
                .then(handleSigningError)
        }

        const now = new Date()

        if (signingResult.status === 'signed') {
            if (!signingResult.signature) {
                throw new Error('No signature returned from signing driver')
            }

            const signedTx: Transaction = {
                commandId,
                status: signingResult.status,
                preparedTransaction,
                preparedTransactionHash,
                origin: existingTx?.origin ?? null,
                ...(existingTx?.createdAt && {
                    createdAt: existingTx.createdAt,
                }),
                signedAt: now,
                externalTxId: signingResult.txId,
            }

            this.store.setTransaction(signedTx)
            this.notifier.emit('txChanged', signedTx)

            return {
                status: signingResult.status,
                signature: signingResult.signature,
                signedBy: wallet.namespace,
                partyId: wallet.partyId,
                externalTxId: signingResult.txId,
            }
        } else {
            const status =
                signingResult.status === 'pending' ? 'pending' : 'failed'
            const pendingTx: Transaction = {
                commandId,
                status,
                preparedTransaction,
                preparedTransactionHash,
                externalTxId: signingResult.txId,
                origin: existingTx?.origin ?? null,
                ...(existingTx?.createdAt && {
                    createdAt: existingTx.createdAt,
                }),
            }

            this.store.setTransaction(pendingTx)

            this.notifier.emit('txChanged', pendingTx)

            return {
                status: signingResult.status,
                externalTxId: signingResult.txId,
                partyId: wallet.partyId,
            }
        }
    }

    public async signWithFireblocks(
        userId: UserId,
        wallet: Wallet,
        signParams: SignParams
    ): Promise<SignResult> {
        const signingProvider = this.signingDrivers[SigningProvider.FIREBLOCKS]
        if (!signingProvider) {
            throw new Error('Fireblocks signing driver not available')
        }
        const driver = signingProvider.controller(userId)

        const { preparedTransaction, preparedTransactionHash, commandId } =
            signParams
        let signingResult: Exclude<
            GetTransactionResult | SignTransactionResult,
            SigningError
        >
        const existingTx = await this.store.getTransaction(commandId)

        if (existingTx && existingTx.externalTxId) {
            signingResult = await driver
                .getTransaction({
                    userId,
                    txId: existingTx.externalTxId,
                })
                .then(handleSigningError)
        } else {
            signingResult = await driver
                .signTransaction({
                    userId,
                    tx: preparedTransaction,
                    txHash: Buffer.from(
                        preparedTransactionHash,
                        'base64'
                    ).toString('hex'),
                    keyIdentifier: {
                        publicKey: wallet.publicKey,
                    },
                })
                .then(handleSigningError)
        }

        const now = new Date()

        if (signingResult.status === 'signed') {
            if (!signingResult.signature) {
                throw new Error('No signature returned from signing driver')
            }

            const signedTx: Transaction = {
                commandId,
                status: signingResult.status,
                preparedTransaction,
                preparedTransactionHash,
                origin: existingTx?.origin ?? null,
                ...(existingTx?.createdAt && {
                    createdAt: existingTx.createdAt,
                }),
                signedAt: now,
                externalTxId: signingResult.txId,
            }

            this.store.setTransaction(signedTx)
            this.notifier.emit('txChanged', signedTx)

            // return signature in format that is already usable in execute
            const decodedSignature = Buffer.from(
                signingResult.signature,
                'hex'
            ).toString('base64')

            return {
                status: signingResult.status,
                signature: decodedSignature,
                signedBy: wallet.namespace,
                partyId: wallet.partyId,
                externalTxId: signingResult.txId,
            }
        } else {
            const status =
                signingResult.status === 'pending' ? 'pending' : 'failed'
            const pendingTx: Transaction = {
                commandId,
                status,
                preparedTransaction,
                preparedTransactionHash,
                externalTxId: signingResult.txId,
                origin: existingTx?.origin ?? null,
                ...(existingTx?.createdAt && {
                    createdAt: existingTx.createdAt,
                }),
            }

            this.store.setTransaction(pendingTx)
            this.notifier.emit('txChanged', pendingTx)

            return {
                status: signingResult.status,
                externalTxId: signingResult.txId,
                partyId: wallet.partyId,
            }
        }
    }

    public async executeWithParticipant(
        userId: UserId,
        executeParams: ExecuteParams,
        transaction: Transaction,
        ledgerClient: LedgerClient,
        network: Network
    ): Promise<ExecuteResult> {
        const { commandId, partyId } = executeParams

        const synchronizerId =
            network.synchronizerId ?? (await ledgerClient.getSynchronizerId())

        const prep = ledgerPrepareParams(
            userId,
            partyId,
            synchronizerId,
            transaction.payload as PrepareParams
        )
        const res = await ledgerClient.postWithRetry(
            '/v2/commands/submit-and-wait',
            prep
        )

        const executedTx: Transaction = {
            commandId,
            status: 'executed',
            preparedTransaction: transaction.preparedTransaction,
            preparedTransactionHash: transaction.preparedTransactionHash,
            payload: res,
            origin: transaction.origin ?? null,
            ...(transaction.createdAt && {
                createdAt: transaction.createdAt,
            }),
            ...(transaction.signedAt && {
                signedAt: transaction.signedAt,
            }),
        }
        this.store.setTransaction(executedTx)
        this.notifier.emit('txChanged', executedTx)

        return res as ExecuteResult
    }

    public async executeWithExternal(
        userId: UserId,
        executeParams: ExecuteParams,
        transaction: Transaction,
        ledgerClient: LedgerClient
    ): Promise<ExecuteResult> {
        const { commandId, partyId, signature, signedBy } = executeParams

        const result = await ledgerClient.postWithRetry(
            '/v2/interactive-submission/execute',
            {
                userId,
                preparedTransaction: transaction.preparedTransaction,
                hashingSchemeVersion: 'HASHING_SCHEME_VERSION_V2',
                submissionId: commandId,
                deduplicationPeriod: {
                    Empty: {},
                },
                partySignatures: {
                    signatures: [
                        {
                            party: partyId,
                            signatures: [
                                {
                                    signature,
                                    signedBy,
                                    format: 'SIGNATURE_FORMAT_CONCAT',
                                    signingAlgorithmSpec:
                                        'SIGNING_ALGORITHM_SPEC_ED25519',
                                },
                            ],
                        },
                    ],
                },
            }
        )

        const executedTx: Transaction = {
            commandId,
            status: 'executed',
            preparedTransaction: transaction.preparedTransaction,
            preparedTransactionHash: transaction.preparedTransactionHash,
            payload: result,
            origin: transaction.origin ?? null,
            ...(transaction.createdAt && {
                createdAt: transaction.createdAt,
            }),
            ...(transaction.signedAt && {
                signedAt: transaction.signedAt,
            }),
        }
        this.store.setTransaction(executedTx)
        this.notifier.emit('txChanged', executedTx)

        return result as ExecuteResult
    }
}
