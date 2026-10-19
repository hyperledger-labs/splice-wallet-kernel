// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LedgerClient } from '@canton-network/core-ledger-client'
import {
    assertConnected,
    AuthTokenProvider,
} from '@canton-network/core-wallet-auth'
import { TransactionService } from '@canton-network/core-wallet-services'
import type { Session, Store } from '@canton-network/core-wallet-store'
import { logger } from '@/shared/logger'
import { authContext } from '../../auth-context'
import type { TxChangedFailedEvent } from '../dapp/rpc-gen/typings'
import { toSigningDrivers, type UserControllerDeps } from './deps'
import type { Methods } from './rpc-gen'
import type {
    DeleteTransactionParams,
    ExecuteParams,
    GetTransactionParams,
    GetTransactionResult,
    SignParams,
} from './rpc-gen/typings'

async function requireSession(
    store: Store,
    accessToken: string
): Promise<Session> {
    const session = await store.getSession(accessToken)
    if (!session) {
        throw new Error('No active session found')
    }
    return session
}

export const transactions = ({
    getStore,
    signingDriver,
    notificationService,
}: UserControllerDeps): Pick<
    Methods,
    | 'sign'
    | 'execute'
    | 'getTransaction'
    | 'listTransactions'
    | 'deleteTransaction'
    | 'getTransactionStatus'
> => {
    const signingDrivers = toSigningDrivers(signingDriver)
    const createTransactionService = (store: Store, sessionId: string) =>
        new TransactionService(
            store,
            signingDrivers,
            notificationService.getNotifier(sessionId),
            'HASHING_SCHEME_VERSION_V3'
        )

    return {
        sign: async (signParams: SignParams) => {
            const connectedContext = assertConnected(await authContext.load())
            const store = await getStore()
            const network = await store.getCurrentNetwork()
            if (network === undefined) {
                throw new Error('No network session found')
            }

            const wallets = await store.getWallets()
            const wallet = wallets.find(
                (candidate) => candidate.partyId === signParams.partyId
            )
            if (wallet === undefined) {
                throw new Error('No primary wallet found')
            }

            const session = await requireSession(
                store,
                connectedContext.accessToken
            )
            const transactionService = createTransactionService(
                store,
                session.id
            )

            logger.info('Signing transaction', {
                transactionId: signParams.transactionId,
            })
            const response = await transactionService.sign(
                connectedContext,
                wallet,
                signParams
            )
            logger.info('Transaction signed', {
                transactionId: signParams.transactionId,
            })

            return response
        },
        execute: async (executeParams: ExecuteParams) => {
            const connectedContext = assertConnected(await authContext.load())
            const store = await getStore()
            const wallets = await store.getWallets()
            const network = await store.getCurrentNetwork()
            const transaction = await store.getTransaction(
                executeParams.transactionId
            )
            const wallet = wallets.find(
                (candidate) => candidate.partyId === executeParams.partyId
            )

            if (wallet === undefined) {
                throw new Error('Requested wallet not found for user')
            }
            if (transaction === undefined) {
                throw new Error('No transaction found')
            }
            if (network === undefined) {
                throw new Error('No network session found')
            }

            const session = await requireSession(
                store,
                connectedContext.accessToken
            )

            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                accessTokenProvider: AuthTokenProvider.fromToken(
                    connectedContext.accessToken
                ),
            })
            const transactionService = createTransactionService(
                store,
                session.id
            )

            logger.info('Executing transaction', {
                transactionId: executeParams.transactionId,
            })
            const response = await transactionService.execute(
                connectedContext.userId,
                wallet,
                transaction,
                executeParams,
                ledgerClient,
                connectedContext,
                network
            )
            logger.info('Transaction executed', {
                transactionId: executeParams.transactionId,
            })

            return response
        },
        getTransaction: async (
            params: GetTransactionParams
        ): Promise<GetTransactionResult> => {
            const store = await getStore()
            const transaction = await store.getTransaction(params.transactionId)
            if (!transaction) {
                throw new Error(
                    `Transaction not found with id: ${params.transactionId}`
                )
            }

            return {
                id: transaction.id,
                commandId: transaction.commandId,
                status: transaction.status,
                preparedTransaction: transaction.preparedTransaction,
                preparedTransactionHash: transaction.preparedTransactionHash,
                payload: transaction.payload
                    ? JSON.stringify(transaction.payload)
                    : '',
                ...(transaction.origin !== null && {
                    origin: transaction.origin,
                }),
                ...(transaction.createdAt && {
                    createdAt: transaction.createdAt.toISOString(),
                }),
                ...(transaction.signedAt && {
                    signedAt: transaction.signedAt.toISOString(),
                }),
                ...(transaction.externalTxId && {
                    externalTxId: transaction.externalTxId,
                }),
                ...(transaction.failureReason && {
                    failureReason: transaction.failureReason,
                }),
            }
        },
        listTransactions: async () => {
            throw new Error('Function listTransactions not implemented.')
        },
        deleteTransaction: async (
            params: DeleteTransactionParams
        ): Promise<null> => {
            const connectedContext = assertConnected(await authContext.load())
            const store = await getStore()
            const transaction = await store.getTransaction(params.transactionId)
            if (!transaction) {
                throw new Error(
                    `Transaction not found with id: ${params.transactionId}`
                )
            }
            if (transaction.status !== 'pending') {
                throw new Error(
                    `Cannot delete transaction with status '${transaction.status}'. Only pending transactions can be deleted.`
                )
            }

            const session = await requireSession(
                store,
                connectedContext.accessToken
            )

            await store.removeTransaction(transaction.id)
            notificationService.getNotifier(session.id).emit('txChanged', {
                status: 'failed',
                commandId: transaction.commandId,
            } satisfies TxChangedFailedEvent)
            return null
        },
        getTransactionStatus: async () => {
            throw new Error('Function getTransactionStatus not implemented.')
        },
    }
}
