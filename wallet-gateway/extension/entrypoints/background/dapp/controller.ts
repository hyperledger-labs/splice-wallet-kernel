// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Disabled unused vars rule to allow for future implementations
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    ledgerPrepareParams,
    networkStatus,
} from '@canton-network/core-wallet-services/utils'
import {
    LedgerClient,
    type PrepareSubmissionResponse,
} from '@canton-network/core-ledger-client'
import type { SigningDriverInterface } from '@canton-network/core-signing-lib'
import { AuthService } from '../auth-service.js'
import buildController from './rpc-gen'
import type {
    ConnectResult,
    LedgerApiParams,
    Network,
    PrepareExecuteParams,
    SignMessageParams,
    SignMessageResult,
    StatusEvent,
    TxChangedPendingEvent,
    Wallet,
} from './rpc-gen/typings.js'

import type { Store, Transaction } from '@canton-network/core-wallet-store'
import { AuthTokenProvider } from '@canton-network/core-wallet-auth'
import { enqueueApprovalRequest } from '@/utils/approval-requests.js'
import { extensionProvider, notifySessionTerminated } from '../status.js'
import type { INotificationService } from '@canton-network/core-wallet-services/notification'

export const dappController = (
    getStore: () => Promise<Store>,
    _signingDriver: SigningDriverInterface,
    notificationService: INotificationService
) =>
    buildController({
        connect: async () => {
            logger.info('Dapp connect status: connecting')

            const context = await AuthService.loadAuthContext()
            const store = await getStore()

            const session =
                context && (await store.getSession(context.accessToken))

            if (!context || !session) {
                return {
                    isConnected: false,
                    isNetworkConnected: false,
                    networkReason: 'Unauthenticated',
                    // userUrl: `${userUrl}/login/`,
                } satisfies ConnectResult
            }

            const network = await store.getCurrentNetwork()
            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger: pinoLogger,
                accessTokenProvider: AuthTokenProvider.fromToken(
                    context.accessToken,
                    pinoLogger
                ),
            })

            const status = await networkStatus(ledgerClient)

            logger.info('Dapp connect status: {*}', { status })
            const notifier = notificationService.getNotifier(session.id)
            const connection = {
                isConnected: true,
                reason: 'OK',
                isNetworkConnected: status.isConnected,
                networkReason: status.reason ? status.reason : 'OK',
                // userUrl: `${userUrl}/login/`,
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
            const context = await AuthService.loadAuthContext()
            if (!context) return null

            const store = await getStore()
            const session = await store.getSession(context.accessToken)
            if (!session) return null

            await store.removeSession(context.accessToken)

            notifySessionTerminated(
                notificationService,
                session.id,
                'disconnect'
            )
            return null
        },
        isConnected: async () => {
            throw new Error('Function isConnected not implemented.')
        },
        ledgerApi: async (params: LedgerApiParams) =>
            Promise.resolve({ response: 'default-response' }),

        prepareExecute: async (params: PrepareExecuteParams) => {
            const context = await AuthService.loadAuthContext()
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

            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger: pinoLogger,
                accessTokenProvider: AuthTokenProvider.fromToken(
                    context.accessToken,
                    pinoLogger
                ),
            })
            const commandId = params.commandId || crypto.randomUUID()
            const transactionId = crypto.randomUUID()
            const synchronizerId =
                network.synchronizerId ??
                (await ledgerClient.getSynchronizerId())

            pinoLogger.info(
                { transactionId, commandId, actAs },
                'prepareExecute: Submitting request to ledger'
            )

            const prepared: PrepareSubmissionResponse =
                await ledgerClient.postWithRetry(
                    '/v2/interactive-submission/prepare',
                    ledgerPrepareParams({
                        userId: context.userId,
                        partyIds: actAs,
                        synchronizerId,
                        params: {
                            ...params,
                            commandId,
                            actAs,
                        },
                        hashingSchemeVersion: 'HASHING_SCHEME_VERSION_V3',
                    })
                )

            const transaction: Transaction = {
                id: transactionId,
                commandId,
                status: 'pending',
                preparedTransaction: prepared.preparedTransaction,
                preparedTransactionHash: prepared.preparedTransactionHash,
                payload: params,
                origin: session.origin || null,
                createdAt: new Date(),
            }

            await store.setTransaction(transaction)

            notificationService.getNotifier(session.id).emit('txChanged', {
                status: 'pending',
                commandId,
            } satisfies TxChangedPendingEvent)

            await enqueueApprovalRequest({ transactionId, commandId })

            pinoLogger.info(
                { transactionId, commandId, actAs },
                'prepareExecute: Prepared transaction for approval'
            )

            return null
        },
        prepareExecuteAndWait: async (params: PrepareExecuteParams) => {
            throw new Error('Function prepareExecuteAndWait not implemented.')
        },
        status: async () => ({
            provider: extensionProvider,
            connection: {
                isConnected: true,
                reason: 'OK',
                isNetworkConnected: true,
                networkReason: 'OK',
            },
        }),
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
        getActiveNetwork: function (): Promise<Network> {
            throw new Error('Function getActiveNetwork not implemented.')
        },
        signMessage: function (
            params: SignMessageParams
        ): Promise<SignMessageResult> {
            throw new Error('Function signMessage not implemented.')
        },
        getPrimaryAccount: async function (): Promise<Wallet> {
            throw new Error('Function getPrimaryAccount not implemented.')
        },
        messageSignature: async () => {
            throw new Error('Only for events.')
        },
    })
