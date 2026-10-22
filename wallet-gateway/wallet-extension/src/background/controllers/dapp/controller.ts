// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    LedgerClient,
    type PrepareSubmissionResponse,
} from '@canton-network/core-ledger-client'
import { providerErrors } from '@canton-network/core-rpc-errors'
import {
    assertConnected,
    type AuthContext,
    AuthTokenProvider,
} from '@canton-network/core-wallet-auth'
import {
    type INotificationService,
    ledgerPrepareParams,
    networkStatus,
} from '@canton-network/core-wallet-services'
import type {
    Network as StoreNetwork,
    Transaction,
} from '@canton-network/core-wallet-store'
import { enqueueApprovalRequest } from '@/shared/approval-requests'
import { logger } from '@/shared/logger'
import { openWalletUi } from '../../open-ui'
import {
    disconnectedStatusEvent,
    extensionProvider,
    notifySessionTerminated,
} from '../../status'
import type { WalletStore } from '../../store'
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
    /** The wallet store, not yet scoped to a user. */
    getStore: () => Promise<WalletStore>
    notificationService: INotificationService
}

/** Where a dApp request comes from. */
export interface DappRequestContext {
    /** Origin of the page that sent the request, e.g. `https://app.example`. */
    origin: string
    /** The vault isn't unlocked. */
    locked: boolean
    /** The signed-in user. Always undefined while locked. */
    auth: AuthContext | undefined
}

function ledgerClientFor(network: StoreNetwork, accessToken: string) {
    return new LedgerClient({
        baseUrl: new URL(network.ledgerApi.baseUrl),
        accessTokenProvider: AuthTokenProvider.fromToken(accessToken),
    })
}

/** The dApp API. Built per request, for the page that sent it. */
export const dappController = (
    { getStore, notificationService }: DappControllerDeps,
    { origin, locked, auth }: DappRequestContext
) => {
    const notConnected = () =>
        disconnectedStatusEvent(locked ? 'Locked' : 'Unauthenticated')

    function requireAuth(): AuthContext {
        if (locked) {
            throw providerErrors.unauthorized({ message: 'Wallet is locked' })
        }
        return assertConnected(auth)
    }

    /**
     * The store, scoped to the request's user. Without one (signed out or
     * locked) it refuses every user read.
     */
    async function loadStore() {
        return (await getStore()).withAuthContext(auth)
    }

    /** The signed-in user's auth context, store and session, if any. */
    async function loadSession() {
        if (!auth) return undefined

        const store = await loadStore()
        const session = await store.getSession(auth.accessToken)
        return session && { context: auth, store, session }
    }

    return buildController({
        connect: async () => {
            logger.info('Dapp connect status: connecting')

            if (locked) {
                // Report "not connected" and show the unlock page.
                await openWalletUi('/unlock').catch((error: unknown) => {
                    logger.error('Failed to open the unlock page: {error}', {
                        error,
                    })
                })
            }

            const signedIn = await loadSession()
            if (!signedIn) return notConnected().connection

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
            if (!signedIn) return notConnected().connection

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
            const context = requireAuth()
            const store = await loadStore()
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
            if (!signedIn) return notConnected()

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
            requireAuth()
            const store = await loadStore()
            return await store.getWallets()
        },
        accountsChanged: async () => {
            throw new Error('Only for events.')
        },
        txChanged: async () => {
            throw new Error('Only for events.')
        },
        getActiveNetwork: async (): Promise<Network> => {
            const context = requireAuth()
            const store = await loadStore()
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
            requireAuth()
            const store = await loadStore()
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
