// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    LedgerClient,
    type PrepareSubmissionResponse,
} from '@canton-network/core-ledger-client'
import {
    assertIsConnected,
    AuthTokenProvider,
} from '@canton-network/core-wallet-auth'
import {
    type INotificationService,
    ledgerPrepareParams,
    networkStatus,
} from '@canton-network/core-wallet-services'
import type {
    Network as StoreNetwork,
    Store,
    Transaction,
} from '@canton-network/core-wallet-store'
import { enqueueApprovalRequest } from '@/shared/approval-requests'
import { logger } from '@/shared/logger'
import { authContext } from '../../auth-context'
import { extensionProvider, notifySessionTerminated } from '../../status'
import buildController from './rpc-gen'
import type {
    ConnectResult,
    Network,
    PrepareExecuteParams,
    StatusEvent,
    TxChangedPendingEvent,
    Wallet,
} from './rpc-gen/typings'

export interface DappControllerDeps {
    getStore: () => Promise<Store>
    notificationService: INotificationService
}

/** Where a dApp request comes from. */
export interface DappRequestContext {
    /** Origin of the page that sent the request, e.g. `https://app.example`. */
    origin: string
}

const unauthenticated = {
    isConnected: false,
    isNetworkConnected: false,
    networkReason: 'Unauthenticated',
} satisfies ConnectResult

function ledgerClientFor(network: StoreNetwork, accessToken: string) {
    return new LedgerClient({
        baseUrl: new URL(network.ledgerApi.baseUrl),
        accessTokenProvider: AuthTokenProvider.fromToken(accessToken),
    })
}

/** The dApp API. Built per request, for the page that sent it. */
export const dappController = (
    { getStore, notificationService }: DappControllerDeps,
    { origin }: DappRequestContext
) => {
    /** The signed-in user's auth context, store and session, if any. */
    async function loadSession() {
        const context = await authContext.load()
        if (!context) return undefined

        const store = await getStore()
        const session = await store.getSession(context.accessToken)
        return session && { context, store, session }
    }

    return buildController({
        connect: async () => {
            logger.info('Dapp connect status: connecting')

            const signedIn = await loadSession()
            if (!signedIn) return unauthenticated

            const { context, store, session } = signedIn
            const network = await store.getCurrentNetwork()
            const status = await networkStatus(
                ledgerClientFor(network, context.accessToken)
            )

            logger.info('Dapp connect status: {*}', { status })
            const notifier = notificationService.getNotifier(session.id)
            const connection = {
                isConnected: true,
                reason: 'OK',
                isNetworkConnected: status.isConnected,
                networkReason: status.reason ? status.reason : 'OK',
            }
            const statusEvent: StatusEvent = {
                provider: extensionProvider,
                connection,
                network: {
                    networkId: network.id,
                    ledgerApi: network.ledgerApi.baseUrl,
                    accessToken: context.accessToken,
                },
                session: {
                    accessToken: context.accessToken,
                    userId: context.userId,
                },
            }
            // NOTE: a dApp only subscribes after a successful `connect`
            // response, so it may miss these; the response carries the same data.
            notifier.emit('statusChanged', statusEvent)
            notifier.emit('connected', statusEvent)
            return connection
        },
        disconnect: async () => {
            const signedIn = await loadSession()
            if (!signedIn) return null

            const { context, store, session } = signedIn
            await store.removeSession(context.accessToken)

            notifySessionTerminated(
                notificationService,
                session.id,
                'disconnect'
            )
            return null
        },
        isConnected: async () => {
            const signedIn = await loadSession()
            if (!signedIn) return unauthenticated

            const { context, store } = signedIn
            const network = await store.getCurrentNetwork()
            const status = await networkStatus(
                ledgerClientFor(network, context.accessToken)
            )
            return {
                isConnected: true,
                reason: 'OK',
                isNetworkConnected: status.isConnected,
                networkReason: status.reason ? status.reason : 'OK',
            } satisfies ConnectResult
        },
        ledgerApi: async () =>
            Promise.resolve({ response: 'default-response' }),

        prepareExecute: async (params: PrepareExecuteParams) => {
            const context = await authContext.load()
            if (!context) {
                throw new Error('Unauthenticated context')
            }

            const store = await getStore()
            const session = await store.getSession(context.accessToken)
            if (!session) {
                throw new Error('No active session found')
            }

            const primaryWallet = await store.getPrimaryWallet()
            const wallets = await store.getWallets()
            const network = await store.getCurrentNetwork()

            let actAs = params.actAs ? [...params.actAs] : []
            if (actAs.length === 0) {
                if (!primaryWallet) {
                    throw new Error(
                        'No primary wallet found. Create or sync a wallet and set it as primary before prepareExecute.'
                    )
                }
                actAs = [primaryWallet.partyId]
            }

            for (const party of actAs) {
                if (!wallets.some((wallet) => wallet.partyId === party)) {
                    throw new Error(
                        `Acting party ${party} does not belong to user`
                    )
                }
            }

            const wallet = wallets.find(
                (candidate) => candidate.partyId === actAs[0]
            )
            if (!wallet) {
                throw new Error(
                    'No wallet found for the first acting party. Create or sync a wallet and set it as primary before prepareExecute.'
                )
            }

            const ledgerClient = ledgerClientFor(network, context.accessToken)
            const commandId = params.commandId || crypto.randomUUID()
            const transactionId = crypto.randomUUID()
            const synchronizerId =
                network.synchronizerId ??
                (await ledgerClient.getSynchronizerId())

            logger.info('prepareExecute: Submitting request to ledger', {
                transactionId,
                commandId,
                actAs,
            })

            const prepared: PrepareSubmissionResponse =
                await ledgerClient.postWithRetry(
                    '/v2/interactive-submission/prepare',
                    ledgerPrepareParams({
                        userId: context.userId,
                        commandId,
                        actAs,
                        synchronizerId,
                        params,
                        hashingSchemeVersion: 'HASHING_SCHEME_VERSION_V3',
                    })
                )

            const transaction: Transaction = {
                id: transactionId,
                commandId,
                status: 'pending',
                preparedTransaction: prepared.preparedTransaction,
                preparedTransactionHash: prepared.preparedTransactionHash,
                payload: { ...params, commandId, actAs },
                // The requesting page, not the session's login origin.
                origin,
                createdAt: new Date(),
            }

            await store.setTransaction(transaction)

            notificationService.getNotifier(session.id).emit('txChanged', {
                status: 'pending',
                commandId,
            } satisfies TxChangedPendingEvent)

            await enqueueApprovalRequest({ transactionId, commandId })

            logger.info('prepareExecute: Prepared transaction for approval', {
                transactionId,
                commandId,
                actAs,
            })

            return null
        },
        prepareExecuteAndWait: async () => {
            throw new Error('Function prepareExecuteAndWait not implemented.')
        },
        status: async (): Promise<StatusEvent> => {
            const signedIn = await loadSession()
            if (!signedIn) {
                return {
                    provider: extensionProvider,
                    connection: {
                        isConnected: false,
                        reason: 'Unauthenticated',
                        isNetworkConnected: false,
                        networkReason: 'Unauthenticated',
                    },
                }
            }

            const { context, store } = signedIn
            const network = await store.getCurrentNetwork()
            const status = await networkStatus(
                ledgerClientFor(network, context.accessToken)
            )
            return {
                provider: extensionProvider,
                connection: {
                    isConnected: true,
                    reason: 'OK',
                    isNetworkConnected: status.isConnected,
                    networkReason: status.reason ? status.reason : 'OK',
                },
                network: {
                    networkId: network.id,
                    ledgerApi: network.ledgerApi.baseUrl,
                    accessToken: context.accessToken,
                },
                session: {
                    accessToken: context.accessToken,
                    userId: context.userId,
                },
            }
        },
        listAccounts: async () => {
            const store = await getStore()
            return await store.getWallets()
        },
        accountsChanged: async () => {
            throw new Error('Only for events.')
        },
        txChanged: async () => {
            throw new Error('Only for events.')
        },
        getActiveNetwork: async (): Promise<Network> => {
            const context = await authContext.load()
            assertIsConnected(context)

            const store = await getStore()
            const network = await store.getCurrentNetwork()
            return {
                networkId: network.id,
                ledgerApi: network.ledgerApi.baseUrl,
                ...(context.accessToken
                    ? { accessToken: context.accessToken }
                    : {}),
            }
        },
        signMessage: async () => {
            throw new Error('Function signMessage not implemented.')
        },
        getPrimaryAccount: async (): Promise<Wallet> => {
            const context = await authContext.load()
            assertIsConnected(context)

            const store = await getStore()
            const wallet = await store.getPrimaryWallet()
            if (!wallet) {
                throw new Error('No primary wallet found')
            }
            return wallet
        },
        messageSignature: async () => {
            throw new Error('Only for events.')
        },
    })
}
