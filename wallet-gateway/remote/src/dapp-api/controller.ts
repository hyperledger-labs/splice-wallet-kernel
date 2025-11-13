// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
// Disabled unused vars rule to allow for future implementations

import { assertConnected, AuthContext } from '@canton-network/core-wallet-auth'
import buildController from './rpc-gen/index.js'
import {
    LedgerApiParams,
    PrepareExecuteParams,
    PrepareReturnParams,
} from './rpc-gen/typings.js'
import { Store } from '@canton-network/core-wallet-store'
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
import { networkStatus } from '../utils.js'

export const dappController = (
    kernelInfo: KernelInfoConfig,
    store: Store,
    notificationService: NotificationService,
    _logger: Logger,
    context?: AuthContext
) => {
    const logger = _logger.child({ component: 'dapp-controller' })
    return buildController({
        connect: async () => {
            if (!context) {
                return {
                    sessionToken: '',
                    status: {
                        kernel: kernelInfo,
                        isConnected: false,
                        isNetworkConnected: false,
                        networkReason: 'Unauthenticated',
                        userUrl: 'http://localhost:3030/login/', // TODO: pull user URL from config
                    },
                }
            }

            const network = await store.getCurrentNetwork()
            const ledgerClient = new LedgerClient(
                new URL(network.ledgerApi.baseUrl),
                logger,
                false,
                context.accessToken
            )
            const status = await networkStatus(ledgerClient)
            return {
                sessionToken: '',
                status: {
                    kernel: kernelInfo,
                    isConnected: true,
                    isNetworkConnected: status.isConnected,
                    networkReason: status.reason ? status.reason : 'OK',
                    userUrl: 'http://localhost:3030/login/', // TODO: pull user URL from config
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
                    userUrl: 'http://localhost:3030/login/', // TODO: pull user URL from config
                })
            }

            return null
        },
        darsAvailable: async () => ({ dars: ['default-dar'] }),
        ledgerApi: async (params: LedgerApiParams) => {
            const network = await store.getCurrentNetwork()
            const ledgerClient = new LedgerClient(
                new URL(network.ledgerApi.baseUrl),
                logger,
                false,
                assertConnected(context).accessToken
            )
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

            const ledgerClient = new LedgerClient(
                new URL(network.ledgerApi.baseUrl),
                logger,
                false,
                context.accessToken
            )

            const userId = context.userId
            const notifier = notificationService.getNotifier(userId)
            const commandId = v4()

            notifier.emit('txChanged', { status: 'pending', commandId })

            const { preparedTransactionHash, preparedTransaction = '' } =
                await prepareSubmission(
                    context.userId,
                    wallet.partyId,
                    network.synchronizerId,
                    params.commands,
                    ledgerClient,
                    commandId
                )

            store.setTransaction({
                commandId,
                status: 'pending',
                preparedTransaction,
                preparedTransactionHash,
                payload: params.commands,
            })

            return {
                // TODO: pull user base URL / port from config
                userUrl: `http://localhost:3030/approve/index.html?commandId=${commandId}&partyId=${wallet.partyId}&txHash=${encodeURIComponent(preparedTransactionHash)}&tx=${encodeURIComponent(preparedTransaction)}`,
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

            const ledgerClient = new LedgerClient(
                new URL(network.ledgerApi.baseUrl),
                logger,
                false,
                context.accessToken
            )

            return prepareSubmission(
                context.userId,
                wallet.partyId,
                network.synchronizerId,
                params.commands,
                ledgerClient
            )
        },
        status: async () => {
            if (!context) {
                return {
                    kernel: kernelInfo,
                    isConnected: false,
                    isNetworkConnected: false,
                    networkReason: 'Unauthenticated',
                }
            }

            const network = await store.getCurrentNetwork()
            const ledgerClient = new LedgerClient(
                new URL(network.ledgerApi.baseUrl),
                logger,
                false,
                context.accessToken
            )
            const status = await networkStatus(ledgerClient)
            return {
                kernel: kernelInfo,
                isConnected: true,
                isNetworkConnected: status.isConnected,
                networkReason: status.reason ? status.reason : 'OK',
                networkId: (await store.getCurrentNetwork()).id,
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
    commands: unknown,
    ledgerClient: LedgerClient,
    commandId?: string
): Promise<PostResponse<'/v2/interactive-submission/prepare'>> {
    const prepareParams = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- because OpenRPC codegen type is incompatible with ledger codegen type
        commands: commands as any,
        commandId: commandId || v4(),
        userId,
        actAs: [partyId],
        readAs: [],
        disclosedContracts: [],
        synchronizerId,
        verboseHashing: false,
        packageIdSelectionPreference: [],
    }

    return await ledgerClient.postWithRetry(
        '/v2/interactive-submission/prepare',
        prepareParams
    )
}
