// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Logger } from 'pino'
import { Store, Transaction, Wallet } from '@canton-network/core-wallet-store'
import type { SignResult } from '../user-api/rpc-gen/typings.js'
import {
    Error as SigningError,
    SigningDriverInterface,
    SigningProvider,
} from '@canton-network/core-signing-lib'
import { SignParams, SignResultSigned } from '../user-api/rpc-gen/typings.js'
import { UserId } from '../dapp-api/rpc-gen/typings.js'
import { Notifier } from '../notification/NotificationService.js'

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
        // TODO consider getting instance in constructor or somewhere instead of taking as arg
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
        wallet: Wallet, // TODO maybe better get it from store based on signParams.partyId?
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
        const internalTxId = crypto
            .randomUUID()
            .replace(/-/g, '')
            .substring(0, 16)
        const result = await driver
            .signTransaction({
                tx: preparedTransaction,
                txHash: preparedTransactionHash,
                keyIdentifier: {
                    publicKey: wallet.publicKey,
                },
                internalTxId,
            })
            .then(handleSigningError)

        const existingTx = await this.store.getTransaction(commandId)
        const now = new Date()

        if (result.status === 'signed') {
            const signedTx: Transaction = {
                commandId,
                status: result.status,
                preparedTransaction,
                preparedTransactionHash,
                origin: existingTx?.origin ?? null,
                ...(existingTx?.createdAt && {
                    createdAt: existingTx.createdAt,
                }),
                signedAt: now,
                externalTxId: result.txId,
            }

            this.store.setTransaction(signedTx)
            this.notifier.emit('txChanged', signedTx)

            return {
                status: result.status,
                signature: result.signature!, // TODO does it have to be optional?
                signedBy: wallet.namespace,
                partyId: wallet.partyId,
                externalTxId: result.txId,
            }
        }

        if (result.status === 'pending') {
            const pendingTx: Transaction = {
                commandId,
                status: result.status,
                preparedTransaction,
                preparedTransactionHash,
                externalTxId: result.txId,
                // TODO do we need to set those?
                origin: existingTx?.origin ?? null,
                ...(existingTx?.createdAt && {
                    createdAt: existingTx.createdAt,
                }),
            }

            this.store.setTransaction(pendingTx)

            // TODO Do I need to emit that if I only save externalTxId?
            this.notifier.emit('txChanged', pendingTx)

            return {
                status: result.status,
                externalTxId: result.txId,
                partyId: wallet.partyId,
            }
        }

        // TODO handle rejected and failed
        throw new Error('tx failed or rejected')
    }
}
