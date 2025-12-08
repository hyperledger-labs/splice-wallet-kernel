// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
// Disabled unused vars rule to allow for future implementations

import { assertConnected, AuthContext } from '@canton-network/core-wallet-auth'
import buildController from './rpc-gen/index.js'
import {
    LedgerApiParams,
    PrepareExecuteParams,
    PrepareReturnParams,
    StatusEvent,
} from './rpc-gen/typings.js'
import { Store, Transaction } from '@canton-network/core-wallet-store'
import {
    LedgerClient,
    GetEndpoint,
    PostEndpoint,
    PostResponse,
} from '@canton-network/core-ledger-client'
import { v4 } from 'uuid'
import { NotificationService } from '../notification/NotificationService.js'
import { KernelInfo as KernelInfoConfig } from '../config/Config.js'
import { Logger } from 'pino'
import { networkStatus, ledgerPrepareParams } from '../utils.js'

export const dappController = (
    kernelInfo: KernelInfoConfig,
    dappUrl: string,
    userUrl: string,
    store: Store,
    notificationService: NotificationService,
    _logger: Logger,
    context?: AuthContext,
    origin?: string
) => {
    const logger = _logger.child({ component: 'dapp-controller' })
    return buildController({
        connect: async () => {
            if (!context || !(await store.getSession())) {
                return {
                    kernel: kernelInfo,
                    isConnected: false,
                    isNetworkConnected: false,
                    networkReason: 'Unauthenticated',
                    userUrl: `${userUrl}/login/`,
                }
            }

            const network = await store.getCurrentNetwork()
            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger,
                isAdmin: false,
                accessToken: context.accessToken,
            })
            const status = await networkStatus(ledgerClient)
            return {
                kernel: kernelInfo,
                isConnected: true,
                isNetworkConnected: status.isConnected,
                networkReason: status.reason ? status.reason : 'OK',
                userUrl: `${userUrl}/login/`,
                network: {
                    networkId: network.id,
                    ledgerApi: {
                        baseUrl: network.ledgerApi.baseUrl,
                    },
                },
                session: {
                    accessToken: context.accessToken,
                    userId: context.userId,
                },
            }
        },
        disconnect: async () => {
            if (!context) {
                return null
            } else {
                const notifier = notificationService.getNotifier(context.userId)
                await store.removeSession()
                notifier.emit('statusChanged', {
                    kernel: kernelInfo,
                    isConnected: false,
                    isNetworkConnected: false,
                    networkReason: 'Unauthenticated',
                    userUrl: `${userUrl}/login/`,
                } as StatusEvent)
            }

            return null
        },
        darsAvailable: async () => ({ dars: ['default-dar'] }),
        ledgerApi: async (params: LedgerApiParams) => {
            const network = await store.getCurrentNetwork()
            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger,
                isAdmin: false,
                accessToken: assertConnected(context).accessToken,
            })
            let result: unknown
            switch (params.requestMethod) {
                case 'GET':
                    result = await ledgerClient.getWithRetry(
                        params.resource as GetEndpoint
                    )
                    break
                case 'POST':
                    result = await ledgerClient.postWithRetry(
                        params.resource as PostEndpoint,
                        params.body
                            ? (JSON.parse(params.body) as never)
                            : (undefined as never)
                    )
                    break
                default:
                    throw new Error(
                        `Unsupported request method: ${params.requestMethod}`
                    )
            }
            return {
                response: JSON.stringify(result),
            }
        },
        prepareExecute: async (params: PrepareExecuteParams) => {
            const wallet = await store.getPrimaryWallet()
            const network = await store.getCurrentNetwork()

            if (context === undefined) {
                throw new Error('Unauthenticated context')
            }

            if (wallet === undefined) {
                throw new Error('No primary wallet found')
            }

            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger,
                isAdmin: false,
                accessToken: context.accessToken,
            })

            const userId = context.userId
            const notifier = notificationService.getNotifier(userId)

            params.commandId = params.commandId || v4()
            const commandId = params.commandId

            notifier.emit('txChanged', { status: 'pending', commandId })

            const synchronizerId =
                network.synchronizerId ??
                (await ledgerClient.getSynchronizerId())

            const { preparedTransactionHash, preparedTransaction = '' } =
                await prepareSubmission(
                    context.userId,
                    wallet.partyId,
                    synchronizerId,
                    params,
                    ledgerClient
                )

            const transaction: Transaction = {
                commandId,
                status: 'pending',
                preparedTransaction,
                preparedTransactionHash,
                payload: params,
                createdAt: new Date(),
            }

            if (origin) {
                transaction.origin = origin
            }

            store.setTransaction(transaction)

            return {
                userUrl: `${userUrl}/approve/index.html?commandId=${commandId}`,
            }
        },
        prepareReturn: async (params: PrepareReturnParams) => {
            const wallet = await store.getPrimaryWallet()
            const network = await store.getCurrentNetwork()

            if (context === undefined) {
                throw new Error('Unauthenticated context')
            }

            if (wallet === undefined) {
                throw new Error('No primary wallet found')
            }

            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger,
                isAdmin: false,
                accessToken: context.accessToken,
            })

            return prepareSubmission(
                context.userId,
                wallet.partyId,
                network.synchronizerId,
                params,
                ledgerClient
            )
        },
        status: async () => {
            if (!context || !(await store.getSession())) {
                return {
                    kernel: kernelInfo,
                    isConnected: false,
                    isNetworkConnected: false,
                    networkReason: 'Unauthenticated',
                }
            }

            const network = await store.getCurrentNetwork()
            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger,
                isAdmin: false,
                accessToken: context.accessToken,
            })
            const status = await networkStatus(ledgerClient)
            return {
                kernel: kernelInfo,
                isConnected: true,
                isNetworkConnected: status.isConnected,
                networkReason: status.reason ? status.reason : 'OK',
                network: {
                    networkId: network.id,
                    ledgerApi: {
                        baseUrl: network.ledgerApi.baseUrl,
                    },
                },
                session: {
                    accessToken: context.accessToken,
                    userId: context.userId,
                },
            }
        },
        onConnected: async () => {
            throw new Error('Only for events.')
        },
        onStatusChanged: async () => {
            throw new Error('Only for events.')
        },
        onAccountsChanged: async () => {
            throw new Error('Only for events.')
        },
        requestAccounts: async () => {
            const wallets = await store.getWallets()
            return wallets
        },
        onTxChanged: async () => {
            throw new Error('Only for events.')
        },
    })
}

async function prepareSubmission(
    userId: string,
    partyId: string,
    synchronizerId: string,
    params: PrepareExecuteParams | PrepareReturnParams,
    ledgerClient: LedgerClient
): Promise<PostResponse<'/v2/interactive-submission/prepare'>> {
    return await ledgerClient.postWithRetry(
        '/v2/interactive-submission/prepare',
        ledgerPrepareParams(userId, partyId, synchronizerId, params)
    )
}
