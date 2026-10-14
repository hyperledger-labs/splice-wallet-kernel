// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    assertIsConnected,
    type AuthContext,
    AuthTokenProvider,
} from '@canton-network/core-wallet-auth'
import buildController from './rpc-gen/index.js'
import type {
    ConnectResult,
    LedgerApiParams,
    LedgerApiResult,
    MessageSignatureEvent,
    Network,
    PrepareExecuteParams,
    SignMessageParams,
    SignMessageResult,
    StatusEvent,
    Wallet,
} from './rpc-gen/typings.js'
import type { Store, Transaction } from '@canton-network/core-wallet-store'
import {
    LedgerClient,
    type GetEndpoint,
    type PostEndpoint,
    type PrepareSubmissionResponse,
    isValidGetEndpoint,
    isValidPostEndpoint,
} from '@canton-network/core-ledger-client'
import { v4 } from 'uuid'
import type { KernelInfo as KernelInfoConfig } from '../config/Config.js'
import type { Logger } from 'pino'
import type { Network as StoreNetwork } from '@canton-network/core-wallet-store'

import { providerErrors, rpcErrors } from '@canton-network/core-rpc-errors'
import {
    networkStatus,
    TransactionService,
    ledgerPrepareParams,
    logDynamically,
    type HASHING_SCHEME_VERSION,
    type NotificationService,
    type SigningDrivers,
} from '@canton-network/core-wallet-services'

export interface DappControllerDeps {
    signingDrivers: SigningDrivers
}

export const dappController = (
    kernelInfo: KernelInfoConfig,
    dappUrl: string,
    userUrl: string,
    store: Store,
    notificationService: NotificationService,
    _logger: Logger,
    origin: string | null,
    deps: DappControllerDeps,
    hashingSchemeVersion: HASHING_SCHEME_VERSION,
    context?: AuthContext
) => {
    const logger = _logger.child({ component: 'dapp-controller' })

    function assertActAsPartiesBelongToUser(
        actAs: string[],
        wallets: Wallet[]
    ): void {
        for (const party of actAs) {
            if (wallets.find((w) => w.partyId === party) === undefined) {
                throw rpcErrors.invalidRequest(
                    `Acting party ${party} does not belong to user`
                )
            }
        }
    }

    async function getActiveSession(context: AuthContext) {
        const session = await store.getSession(context.accessToken)
        if (!session) {
            throw providerErrors.unauthorized({
                message: 'No active session found',
            })
        }
        return session
    }

    return buildController({
        connect: async () => {
            const session =
                context && (await store.getSession(context.accessToken))

            if (!context || !session) {
                return {
                    isConnected: false,
                    isNetworkConnected: false,
                    networkReason: 'Unauthenticated',
                    userUrl: `${userUrl}/login/`,
                } satisfies ConnectResult
            }

            const network = await store.getCurrentNetwork()
            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger,
                accessTokenProvider: AuthTokenProvider.fromToken(
                    context.accessToken,
                    logger
                ),
            })

            const status = await networkStatus(ledgerClient)
            const notifier = notificationService.getNotifier(session.id)
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
            notifier.emit('connected', statusEvent)
            return connection
        },
        disconnect: async () => {
            if (!context) return null

            const session = await store.getSession(context.accessToken)
            if (!session?.id) {
                return null
            } else {
                const notifier = notificationService.getNotifier(session.id)
                await store.removeSession(context.accessToken)
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
        isConnected: async () => {
            if (!context || !(await store.getSession(context.accessToken))) {
                return {
                    isConnected: false,
                    isNetworkConnected: false,
                    networkReason: 'Unauthenticated',
                    userUrl: `${userUrl}/login/`,
                } satisfies ConnectResult
            }

            const network = await store.getCurrentNetwork()
            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger,
                accessTokenProvider: AuthTokenProvider.fromToken(
                    context.accessToken,
                    logger
                ),
            })
            const status = await networkStatus(ledgerClient)
            return {
                isConnected: true,
                reason: 'OK',
                isNetworkConnected: status.isConnected,
                networkReason: status.reason ? status.reason : 'OK',
                userUrl: `${userUrl}/login/`,
            } satisfies ConnectResult
        },
        ledgerApi: async (params: LedgerApiParams) => {
            assertIsConnected(context)

            const network = await store.getCurrentNetwork()
            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger,
                accessTokenProvider: AuthTokenProvider.fromToken(
                    context.accessToken,
                    logger
                ),
            })

            let result: LedgerApiResult

            switch (params.requestMethod) {
                case 'get':
                    if (!isValidGetEndpoint(params.resource)) {
                        throw new Error(
                            `Unsupported get resource: ${params.resource}`
                        )
                    }
                    result = await ledgerClient.getWithRetry(
                        params.resource as GetEndpoint,
                        undefined,
                        { path: params.path ?? {}, query: params.query ?? {} }
                    )
                    break
                case 'post':
                    if (!isValidPostEndpoint(params.resource)) {
                        throw new Error(
                            `Unsupported post resource: ${params.resource}`
                        )
                    }
                    result = await ledgerClient.postWithRetry(
                        params.resource as PostEndpoint,
                        params.body as never,
                        undefined,
                        { query: params.query ?? {}, path: params.path ?? {} }
                    )
                    break
                default:
                    throw new Error(
                        `Unsupported request method: ${params.requestMethod}`
                    )
            }
            return result
        },
        prepareExecute: async (params: PrepareExecuteParams) => {
            assertIsConnected(context)

            const primaryWallet = await store.getPrimaryWallet()
            const wallets = await store.getWallets()
            const network = await store.getCurrentNetwork()

            // determine user ID
            const gatewayUserId = context.userId
            let ledgerUserId = context.userId
            const accessTokenProvider: AuthTokenProvider =
                AuthTokenProvider.fromToken(context.accessToken, logger)

            if (context.isApiKey) {
                logger.info(
                    'Authenticated with API Key, fetching m2m token for ledger access'
                )
                ledgerUserId = context.ledgerUserId
            }

            // determine party ID
            let actAs = params.actAs || []
            if (actAs.length === 0) {
                if (!primaryWallet) {
                    throw new Error(
                        'No primary wallet found. Create or sync a wallet and set it as primary before prepareExecute.'
                    )
                }
                actAs = [primaryWallet.partyId]
            }

            assertActAsPartiesBelongToUser(actAs, wallets)

            // determine wallet
            const wallet = wallets.find((w) => w.partyId === actAs[0])
            if (wallet === undefined) {
                throw new Error(
                    'No wallet found for the first acting party. Create or sync a wallet and set it as primary before prepareExecute.'
                )
            }

            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger,
                accessTokenProvider,
            })

            const session = await getActiveSession(context)
            const notifier = notificationService.getNotifier(session.id)

            const commandId = params.commandId || v4()
            const transactionId = v4()

            notifier.emit('txChanged', { status: 'pending', commandId })

            const synchronizerId =
                network.synchronizerId ??
                (await ledgerClient.getSynchronizerId())

            logDynamically(
                logger,
                'prepareExecute: Submitting request to ledger',
                {
                    info: { transactionId },
                    debug: {
                        commandId,
                        gatewayUserId,
                        ledgerUserId,
                        actAs,
                        params,
                    },
                }
            )

            const prepared = await prepareSubmission(
                ledgerUserId,
                commandId,
                actAs,
                synchronizerId,
                params,
                ledgerClient,
                hashingSchemeVersion
            )

            logDynamically(
                logger,
                'prepareExecute: Received response from ledger',
                {
                    info: { transactionId },
                    debug: {
                        commandId,
                        gatewayUserId,
                        ledgerUserId,
                        actAs,
                        prepared,
                    },
                }
            )

            const transaction: Transaction = {
                id: transactionId,
                commandId,
                status: 'pending',
                preparedTransaction: prepared.preparedTransaction,
                preparedTransactionHash: prepared.preparedTransactionHash,
                payload: { ...params, commandId, actAs },
                origin: origin || null,
                createdAt: new Date(),
            }

            logger.info(
                {
                    actAs,
                    readAs: params.readAs || [],
                    gatewayUserId,
                    ledgerUserId,
                    commandId,
                    commands: params.commands?.[0],
                    confirmationRequestTrafficCostEstimation:
                        prepared.costEstimation
                            ?.confirmationRequestTrafficCostEstimation,
                },
                'prepared transaction traffic estimation'
            )

            await store.setTransaction(transaction)

            const approveUrl = `${userUrl}/approve/index.html?transactionId=${transactionId}&commandId=${commandId}&closeafteraction`

            if (context.isApiKey) {
                logger.info(
                    {
                        gatewayUserId,
                        ledgerUserId,
                        commandId,
                        transactionId,
                        signingProviderId: wallet.signingProviderId,
                    },
                    'Service account straight-through prepare/sign/execute'
                )
                const transactionService = new TransactionService(
                    store,
                    logger,
                    deps!.signingDrivers,
                    notifier,
                    hashingSchemeVersion
                )
                try {
                    await transactionService.signAndExecute(
                        context,
                        network,
                        wallet,
                        transaction
                    )
                } catch (error) {
                    logger.error(
                        {
                            err: error,
                            gatewayUserId,
                            ledgerUserId,
                            commandId,
                            transactionId,
                            actAs,
                            signingProviderId: wallet.signingProviderId,
                        },
                        'Service account sign/execute failed after prepare'
                    )
                    throw error
                }
            }

            return {
                // closeafteraction query param flag makes approving or deleting tx close the popup
                userUrl: approveUrl,
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
            if (!context || !(await store.getSession(context.accessToken))) {
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

            const session = await store.getSession(context.accessToken)
            const network = await store.getCurrentNetwork()
            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger,
                accessTokenProvider: AuthTokenProvider.fromToken(
                    context.accessToken,
                    logger
                ),
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
        listAccounts: async () => {
            assertIsConnected(context)

            return await store.getWallets()
        },
        getActiveNetwork: async (): Promise<Network> => {
            assertIsConnected(context)

            const network: StoreNetwork = await store.getCurrentNetwork()
            return {
                networkId: network.id,
                ledgerApi: network.ledgerApi.baseUrl,
                ...(context.accessToken
                    ? { accessToken: context.accessToken }
                    : {}),
            }
        },
        signMessage: async (
            params: SignMessageParams
        ): Promise<SignMessageResult> => {
            assertIsConnected(context)

            if (!params?.message) throw new Error('Message is required')

            const wallet = await store.getPrimaryWallet()

            if (wallet === undefined) {
                throw new Error('No primary wallet found')
            }

            const session = await getActiveSession(context)
            const notifier = notificationService.getNotifier(session.id)
            const messageId = v4()
            await store.setMessageRaw({
                id: messageId,
                status: 'pending',
                userId: context.userId,
                partyId: wallet.partyId,
                publicKey: wallet.publicKey,
                message: params.message,
                origin: origin || null,
                createdAt: new Date(),
            })

            notifier.emit('messageSignature', {
                status: 'pending',
                messageId,
            } satisfies MessageSignatureEvent)

            return {
                messageId,
                userUrl: `${userUrl}/sign-message/index.html?messageId=${messageId}&closeafteraction`,
            }
        },
        getPrimaryAccount: async function (): Promise<Wallet> {
            assertIsConnected(context)

            const wallet = await store.getPrimaryWallet()
            if (!wallet) {
                throw new Error('No primary wallet found')
            }
            return wallet
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
        txChanged: async () => {
            throw new Error('Only for events.')
        },
        messageSignature: function (): Promise<MessageSignatureEvent> {
            throw new Error('Only for events.')
        },
    })
}

async function prepareSubmission(
    userId: string,
    commandId: string,
    actAs: string[],
    synchronizerId: string,
    params: PrepareExecuteParams,
    ledgerClient: LedgerClient,
    hashingSchemeVersion: HASHING_SCHEME_VERSION
): Promise<PrepareSubmissionResponse> {
    return await ledgerClient.postWithRetry(
        '/v2/interactive-submission/prepare',
        ledgerPrepareParams({
            userId,
            commandId,
            actAs,
            synchronizerId,
            params,
            hashingSchemeVersion,
        })
    )
}
