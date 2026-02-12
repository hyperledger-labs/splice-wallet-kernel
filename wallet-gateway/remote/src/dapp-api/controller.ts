// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { assertConnected, AuthContext } from '@canton-network/core-wallet-auth'
import buildController from './rpc-gen/index.js'
import {
    ConnectResult,
    LedgerApiParams,
    Network,
    PrepareExecuteParams,
    SignMessageResult,
    StatusEvent,
    Wallet,
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
    origin: string | null,
    context?: AuthContext
) => {
    const logger = _logger.child({ component: 'dapp-controller' })
    return buildController({
        connect: async () => {
            if (!context || !(await store.getSession())) {
                return {
                    isConnected: false,
                    isNetworkConnected: false,
                    networkReason: 'Unauthenticated',
                    userUrl: `${userUrl}/login/`,
                } satisfies ConnectResult
            }

            // const session = await store.getSession()
            const network = await store.getCurrentNetwork()
            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger,
                isAdmin: false,
                accessToken: context.accessToken,
            })
            const status = await networkStatus(ledgerClient)
            const notifier = notificationService.getNotifier(context.userId)
            const provider = {
                id: kernelInfo.id,
                version: 'TODO',
                providerType: kernelInfo.clientType,
                url: dappUrl,
                userUrl: `${userUrl}/login/`,
            }
            const connection = {
                isConnected: true,
                reason: 'OK',
                isNetworkConnected: status.isConnected,
                networkReason: status.reason ? status.reason : 'OK',
                userUrl: `${userUrl}/login/`,
            }
            const statusEvent: StatusEvent = {
                provider,
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
            notifier.emit('statusChanged', statusEvent)
            return connection
        },
        disconnect: async () => {
            if (!context) {
                return null
            } else {
                const notifier = notificationService.getNotifier(context.userId)
                await store.removeSession()
                notifier.emit('statusChanged', {
                    provider: {
                        id: kernelInfo.id,
                        providerType: kernelInfo.clientType,
                        url: dappUrl,
                        userUrl: `${userUrl}/login/`,
                    },
                    connection: {
                        isConnected: false,
                        reason: 'disconnect',
                        isNetworkConnected: false,
                        networkReason: 'disconnect',
                    },
                } as StatusEvent)
            }

            return null
        },
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
                origin: origin || null,
                createdAt: new Date(),
            }

            store.setTransaction(transaction)

            return {
                // closeafteraction query param flag makes approving or deleting tx close the popup
                userUrl: `${userUrl}/approve/index.html?commandId=${commandId}&closeafteraction`,
            }
        },
        status: async () => {
            const provider = {
                id: kernelInfo.id,
                version: 'TODO',
                providerType: kernelInfo.clientType,
                url: dappUrl,
                userUrl: `${userUrl}/login/`,
            }
            if (!context || !(await store.getSession())) {
                return {
                    provider: provider,
                    connection: {
                        isConnected: false,
                        reason: 'Unauthenticated',
                        isNetworkConnected: false,
                        networkReason: 'Unauthenticated',
                    },
                }
            }

            const session = await store.getSession()
            const network = await store.getCurrentNetwork()
            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger,
                isAdmin: false,
                accessToken: context.accessToken,
            })
            const status = await networkStatus(ledgerClient)

            return {
                provider: provider,
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
                    id: session?.id,
                    accessToken: context.accessToken,
                    userId: context.userId,
                },
                userUrl: `${userUrl}/login/`,
            }
        },
        connected: async () => {
            throw new Error('Only for events.')
        },
        onStatusChanged: async () => {
            throw new Error('Only for events.')
        },
        accountsChanged: async () => {
            throw new Error('Only for events.')
        },
        listAccounts: async () => {
            return await store.getWallets()
        },
        txChanged: async () => {
            throw new Error('Only for events.')
        },
        getActiveNetwork: function (): Promise<Network> {
            throw new Error('Function not implemented.')
        },
        signMessage: function (): Promise<SignMessageResult> {
            throw new Error('Function not implemented.')
        },
        getPrimaryAccount: async function (): Promise<Wallet> {
            const wallet = await store.getPrimaryWallet()
            if (!wallet) {
                throw new Error('No primary wallet found')
            }
            return wallet
        },
    })
}

async function prepareSubmission(
    userId: string,
    partyId: string,
    synchronizerId: string,
    params: PrepareExecuteParams,
    ledgerClient: LedgerClient
): Promise<PostResponse<'/v2/interactive-submission/prepare'>> {
    return await ledgerClient.postWithRetry(
        '/v2/interactive-submission/prepare',
        ledgerPrepareParams(userId, partyId, synchronizerId, params)
    )
}
