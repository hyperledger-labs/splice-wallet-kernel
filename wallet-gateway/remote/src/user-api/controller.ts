// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Disabled unused vars rule to allow for future implementations
/* eslint-disable @typescript-eslint/no-unused-vars */
import { LedgerClient } from '@canton-network/core-ledger-client'
import buildController from './rpc-gen/index.js'
import {
    AddNetworkParams,
    RemoveNetworkParams,
    ExecuteParams,
    SignParams,
    AddSessionParams,
    AddSessionResult,
    ListSessionsResult,
    SetPrimaryWalletParams,
    SyncWalletsResult,
    IsWalletSyncNeededResult,
    AddIdpParams,
    RemoveIdpParams,
    CreateWalletParams,
    AllocatePartyForWalletParams,
    GetTransactionResult,
    GetTransactionParams,
    DeleteTransactionParams,
    Null,
    ListTransactionsResult,
    GetUserResult,
} from './rpc-gen/typings.js'
import {
    Store,
    Transaction,
    Network,
    Wallet,
} from '@canton-network/core-wallet-store'
import { Logger } from 'pino'
import { NotificationService } from '../notification/NotificationService.js'
import {
    AccessTokenProvider,
    assertConnected,
    AuthContext,
    authSchema,
    AuthTokenProvider,
    idpSchema,
} from '@canton-network/core-wallet-auth'
import { KernelInfo } from '../config/Config.js'
import {
    SigningDriverInterface,
    SigningProvider,
    Error as SigningError,
} from '@canton-network/core-signing-lib'
import { PartyAllocationService } from '../ledger/party-allocation-service.js'
import { WalletAllocationService } from '../ledger/wallet-allocation/wallet-allocation-service.js'
import { WalletSyncService } from '../ledger/wallet-sync-service.js'
import { networkStatus } from '../utils.js'
import { v4 } from 'uuid'
import { TransactionService } from '../ledger/transaction-service.js'

type AvailableSigningDrivers = Partial<
    Record<SigningProvider, SigningDriverInterface>
>

export const userController = (
    kernelInfo: KernelInfo,
    userUrl: string,
    store: Store,
    notificationService: NotificationService,
    authContext: AuthContext | undefined,
    drivers: AvailableSigningDrivers,
    _logger: Logger,
    adminUserId?: string
) => {
    const logger = _logger.child({ component: 'user-controller' })
    const provider = {
        id: kernelInfo.id,
        version: 'TODO',
        providerType: kernelInfo.clientType,
        userUrl: `${userUrl}/login/`,
    }

    function assertAdmin(): void {
        const userId = assertConnected(authContext).userId
        if (!adminUserId || userId !== adminUserId) {
            throw new Error(
                'Unauthorized: only the admin user can perform this operation'
            )
        }
    }

    function handleSigningError<T extends object>(result: SigningError | T): T {
        if ('error' in result) {
            throw new Error(
                `Error from signing driver: ${result.error_description}`
            )
        }
        return result
    }

    return buildController({
        getUser: async (): Promise<GetUserResult> => {
            const userId = assertConnected(authContext).userId
            return {
                userId,
                isAdmin: !!adminUserId && userId === adminUserId,
            }
        },
        addNetwork: async (params: AddNetworkParams) => {
            assertAdmin()
            const { network } = params

            const ledgerApi = {
                baseUrl: network.ledgerApi ?? '',
            }

            const auth = authSchema.parse(network.auth)
            const adminAuth = network.adminAuth
                ? authSchema.parse(network.adminAuth)
                : undefined

            const newNetwork: Network = {
                name: network.name,
                id: network.id,
                description: network.description,
                synchronizerId: network.synchronizerId,
                identityProviderId: network.identityProviderId,
                auth,
                adminAuth,
                ledgerApi,
            }

            // TODO: Add an explicit updateNetwork method to the User API spec and controller
            const existingNetworks = await store.listNetworks()
            if (existingNetworks.find((n) => n.id === newNetwork.id)) {
                logger.info(`Updating network ${newNetwork.id}`)
                await store.updateNetwork(newNetwork)
            } else {
                logger.info(`Adding network ${newNetwork.id}`)
                await store.addNetwork(newNetwork)
            }

            return null
        },
        removeNetwork: async (params: RemoveNetworkParams) => {
            assertAdmin()
            await store.removeNetwork(params.networkName)
            return null
        },
        listNetworks: async () =>
            Promise.resolve({ networks: await store.listNetworks() }),
        addIdp: async (params: AddIdpParams) => {
            assertAdmin()
            const validatedIdp = idpSchema.parse(params.idp)

            // TODO: Add an explicit updateIdp method to the User API spec and controller
            const existingIdps = await store.listIdps()
            if (existingIdps.find((n) => n.id === validatedIdp.id)) {
                logger.info(`Updating IDP ${validatedIdp.id}`)
                await store.updateIdp(validatedIdp)
            } else {
                logger.info(`Adding IDP ${validatedIdp.id}`)
                await store.addIdp(validatedIdp)
            }

            return null
        },
        removeIdp: async (params: RemoveIdpParams) => {
            assertAdmin()
            logger.info(`Removing IDP ${params.identityProviderId}`)
            await store.removeIdp(params.identityProviderId)
            return null
        },
        listIdps: async () => Promise.resolve({ idps: await store.listIdps() }),
        createWallet: async (params: CreateWalletParams) => {
            logger.info(
                `Creating wallet with params: ${JSON.stringify(params)}`
            )

            const { signingProviderId, primary, partyHint } = params

            const userId = assertConnected(authContext).userId
            const notifier = notificationService.getNotifier(userId)
            const network = await store.getCurrentNetwork()

            if (network === undefined) {
                throw new Error('No network session found')
            }

            const idp = await store.getIdp(network.identityProviderId)

            const adminTokenProvider = AuthTokenProvider.fromGatewayConfig(
                idp,
                network.adminAuth,
                logger
            )

            const partyAllocator = new PartyAllocationService({
                synchronizerId: network.synchronizerId,
                accessTokenProvider: adminTokenProvider,
                httpLedgerUrl: network.ledgerApi.baseUrl,
                logger,
            })
            const walletAllocationService = new WalletAllocationService(
                store,
                logger,
                partyAllocator,
                drivers
            )

            if (!drivers[signingProviderId as SigningProvider]) {
                throw new Error(
                    `Signing provider ${signingProviderId} not supported`
                )
            }

            const wallet = await walletAllocationService.createWallet(
                userId,
                partyHint,
                primary ?? false,
                signingProviderId as SigningProvider
            )

            const wallets = await store.getWallets()
            notifier?.emit('accountsChanged', wallets)

            return { wallet }
        },
        allocatePartyForWallet: async (
            params: AllocatePartyForWalletParams
        ) => {
            logger.info(
                `Allocating party for wallet: ${JSON.stringify(params)}`
            )

            const userId = assertConnected(authContext).userId
            const notifier = notificationService.getNotifier(userId)
            const network = await store.getCurrentNetwork()
            if (!network) {
                throw new Error('No network session found')
            }

            const allWallets = await store.getWallets()
            const existingWallet = allWallets.find(
                (w) =>
                    w.partyId === params.partyId && w.networkId === network.id
            )
            if (!existingWallet) {
                throw new Error(`Wallet not found for party ${params.partyId}`)
            }

            const idp = await store.getIdp(network.identityProviderId)
            const accessTokenProvider = AuthTokenProvider.fromGatewayConfig(
                idp,
                network.adminAuth,
                logger
            )
            const partyAllocator = new PartyAllocationService({
                synchronizerId: network.synchronizerId,
                accessTokenProvider,
                httpLedgerUrl: network.ledgerApi.baseUrl,
                logger,
            })
            const walletAllocationService = new WalletAllocationService(
                store,
                logger,
                partyAllocator,
                drivers
            )

            const signingProviderId =
                existingWallet.signingProviderId as SigningProvider
            if (!drivers[signingProviderId]) {
                throw new Error(
                    `Signing provider ${signingProviderId} not supported`
                )
            }

            await walletAllocationService.allocateParty(
                userId,
                existingWallet,
                signingProviderId
            )

            const wallets = await store.getWallets()
            const wallet = wallets.find(
                (w) =>
                    w.partyId === existingWallet.partyId &&
                    w.networkId === network.id
            )!
            notifier?.emit('accountsChanged', wallets)

            return { wallet }
        },
        setPrimaryWallet: async (params: SetPrimaryWalletParams) => {
            await store.setPrimaryWallet(params.partyId)
            const notifier = authContext?.userId
                ? notificationService.getNotifier(authContext.userId)
                : undefined

            const wallets = await store.getWallets()
            notifier?.emit('accountsChanged', wallets)
            return null
        },
        removeWallet: async (params: { partyId: string }) =>
            Promise.resolve({}),
        listWallets: async (params: {
            filter?: { signingProviderIds?: string[] }
        }) => {
            return await store.getWallets(params.filter)
        },
        sign: async (signParams: SignParams) => {
            const network = await store.getCurrentNetwork()
            if (network === undefined) {
                throw new Error('No network session found')
            }

            const wallets = await store.getWallets()
            const wallet = wallets.find((w) => w.partyId === signParams.partyId)

            if (wallet === undefined) {
                throw new Error('No primary wallet found')
            }

            const userId = assertConnected(authContext).userId

            const notifier = notificationService.getNotifier(userId)
            const signingProvider = wallet.signingProviderId as SigningProvider
            const driver = drivers[signingProvider]?.controller(userId)

            if (!driver) {
                throw new Error(
                    `No driver found for ${wallet.signingProviderId}`
                )
            }

            const transactionService = new TransactionService(
                store,
                logger,
                drivers,
                notifier
            )

            switch (wallet.signingProviderId) {
                case SigningProvider.PARTICIPANT: {
                    return transactionService.signWithParticipant(wallet)
                }
                case SigningProvider.WALLET_KERNEL: {
                    return transactionService.signWithWalletKernel(
                        userId,
                        wallet,
                        signParams
                    )
                }
                case SigningProvider.BLOCKDAEMON: {
                    return transactionService.signWithBlockdaemon(
                        userId,
                        wallet,
                        signParams
                    )
                }
                case SigningProvider.FIREBLOCKS: {
                    return transactionService.signWithFireblocks(
                        userId,
                        wallet,
                        signParams
                    )
                }
                default:
                    throw new Error(
                        `Unsupported signing provider: ${wallet.signingProviderId}`
                    )
            }
        },
        execute: async (executeParams: ExecuteParams) => {
            const wallet = await store.getPrimaryWallet()
            const network = await store.getCurrentNetwork()
            const transaction = await store.getTransaction(
                executeParams.commandId
            )

            if (wallet === undefined) {
                throw new Error('No primary wallet found')
            }

            if (transaction === undefined) {
                throw new Error('No transaction found')
            }

            const userId = assertConnected(authContext).userId

            if (network === undefined) {
                throw new Error('No network session found')
            }

            const notifier = notificationService.getNotifier(userId)

            // Create AccessTokenProvider for user token
            const userAccessTokenProvider = AuthTokenProvider.fromToken(
                authContext!.accessToken,
                logger
            )

            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger,
                accessTokenProvider: userAccessTokenProvider,
            })

            const transactionService = new TransactionService(
                store,
                logger,
                drivers,
                notifier
            )

            switch (wallet.signingProviderId) {
                case SigningProvider.PARTICIPANT: {
                    try {
                        return await transactionService.executeWithParticipant(
                            userId,
                            executeParams,
                            transaction,
                            ledgerClient,
                            network
                        )
                    } catch (error) {
                        logger.error(error, 'Failed to submit transaction')
                        throw error
                    }
                }
                case SigningProvider.WALLET_KERNEL:
                case SigningProvider.BLOCKDAEMON:
                case SigningProvider.FIREBLOCKS: {
                    return transactionService.executeWithExternal(
                        userId,
                        executeParams,
                        transaction,
                        ledgerClient
                    )
                }
                default:
                    throw new Error(
                        `Unsupported signing provider: ${wallet.signingProviderId}`
                    )
            }
        },
        addSession: async function (
            params: AddSessionParams
        ): Promise<AddSessionResult> {
            try {
                const newSessionId = v4()
                logger.info(
                    `Adding session with ID ${newSessionId} for network ${params.networkId}`
                )

                await store.setSession({
                    id: newSessionId,
                    network: params.networkId,
                    accessToken: authContext?.accessToken || '',
                })
                const network = await store.getCurrentNetwork()
                const idp = await store.getIdp(network.identityProviderId)
                // Assumption: `setSession` calls `assertConnected`, so its safe to declare that the authContext is defined.
                const { userId, accessToken } = authContext!
                const notifier = notificationService.getNotifier(userId)

                const ledgerClient = new LedgerClient({
                    baseUrl: new URL(network.ledgerApi.baseUrl),
                    logger,
                    accessTokenProvider: AuthTokenProvider.fromToken(
                        accessToken,
                        logger
                    ),
                })
                const status = await networkStatus(ledgerClient)
                notifier.emit('statusChanged', {
                    provider: provider,
                    connection: {
                        isConnected: status.isConnected,
                        reason: status.reason ? status.reason : 'OK',
                        isNetworkConnected: status.isConnected,
                        networkReason: status.reason ? status.reason : 'OK',
                    },
                    network: {
                        networkId: network.id,
                        ledgerApi: network.ledgerApi.baseUrl,
                        accessToken: accessToken,
                    },
                    session: {
                        id: newSessionId,
                        accessToken: accessToken,
                        userId: userId,
                    },
                })

                //we only want to automatically perform a sync if it is the first time a session is created
                const wallets = await store.getWallets()
                if (wallets.length == 0) {
                    const adminAccessTokenProvider =
                        AuthTokenProvider.fromGatewayConfig(
                            idp,
                            network.adminAuth,
                            logger
                        )
                    const partyAllocator = new PartyAllocationService({
                        synchronizerId: network.synchronizerId,
                        accessTokenProvider: adminAccessTokenProvider,
                        httpLedgerUrl: network.ledgerApi.baseUrl,
                        logger,
                    })

                    const service = new WalletSyncService(
                        store,
                        ledgerClient,
                        authContext!,
                        logger,
                        drivers,
                        partyAllocator
                    )
                    await service.syncWallets()
                }

                const rights = await store.getUserRights(network.id)
                return Promise.resolve({
                    id: newSessionId,
                    accessToken,
                    network,
                    idp,
                    status: status.isConnected ? 'connected' : 'disconnected',
                    reason: status.reason ? status.reason : 'OK',
                    rights: rights,
                })
            } catch (error) {
                logger.error(`Failed to add session: ${error}`)
                throw new Error(`Failed to add session: ${error}`, {
                    cause: error,
                })
            }
        },
        removeSession: async (): Promise<Null> => {
            logger.info(authContext, 'Removing session')
            const userId = assertConnected(authContext).userId
            const notifier = notificationService.getNotifier(userId)
            await store.removeSession()

            notifier.emit('statusChanged', {
                provider: provider,
                connection: {
                    isConnected: false,
                    reason: 'disconnect',
                    isNetworkConnected: false,
                    networkReason: 'removed session',
                },
                network: undefined,
                session: undefined,
                userUrl: `${userUrl}/login/`,
            })

            return null
        },
        listSessions: async (): Promise<ListSessionsResult> => {
            const session = await store.getSession()
            if (!session) {
                return { sessions: [] }
            }

            const network = await store.getNetwork(session.network)
            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger,
                accessTokenProvider: AuthTokenProvider.fromToken(
                    authContext!.accessToken,
                    logger
                ),
            })
            const idp = await store.getIdp(network.identityProviderId)
            const status = await networkStatus(ledgerClient)
            const rights = await store.getUserRights(network.id)
            return {
                sessions: [
                    {
                        id: session.id,
                        network,
                        idp: idp,
                        accessToken: authContext!.accessToken,
                        status: status.isConnected
                            ? 'connected'
                            : 'disconnected',
                        reason: status.reason ? status.reason : 'OK',
                        rights: rights,
                    },
                ],
            }
        },
        syncWallets: async function (): Promise<SyncWalletsResult> {
            const network = await store.getCurrentNetwork()
            const { userId } = assertConnected(authContext)

            const userAccessTokenProvider = AuthTokenProvider.fromToken(
                authContext!.accessToken,
                logger
            )

            const idp = await store.getIdp(network.identityProviderId)
            const adminAccessTokenProvider =
                AuthTokenProvider.fromGatewayConfig(
                    idp,
                    network.adminAuth,
                    logger
                )

            const partyAllocator = new PartyAllocationService({
                synchronizerId: network.synchronizerId,
                accessTokenProvider: adminAccessTokenProvider,
                httpLedgerUrl: network.ledgerApi.baseUrl,
                logger,
            })

            const userLedger = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger,
                accessTokenProvider: userAccessTokenProvider,
            })

            const service = new WalletSyncService(
                store,
                userLedger,
                authContext!,
                logger,
                drivers,
                partyAllocator
            )
            const result = await service.syncWallets()
            if (
                (result.added.length === 0 && result.updated.length === 0) ||
                result.disabled.length === 0
            ) {
                return result
            }
            const notifier = notificationService.getNotifier(userId)
            const wallets = await store.getWallets()
            notifier?.emit('accountsChanged', wallets)
            return result
        },
        isWalletSyncNeeded: async (): Promise<IsWalletSyncNeededResult> => {
            const network = await store.getCurrentNetwork()
            assertConnected(authContext)

            const userAccessTokenProvider = AuthTokenProvider.fromToken(
                authContext!.accessToken,
                logger
            )

            const idp = await store.getIdp(network.identityProviderId)
            const adminAccessTokenProvider =
                AuthTokenProvider.fromGatewayConfig(
                    idp,
                    network.adminAuth,
                    logger
                )

            const partyAllocator = new PartyAllocationService({
                synchronizerId: network.synchronizerId,
                accessTokenProvider: adminAccessTokenProvider,
                httpLedgerUrl: network.ledgerApi.baseUrl,
                logger,
            })

            const userLedger = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger,
                accessTokenProvider: userAccessTokenProvider,
            })

            const service = new WalletSyncService(
                store,
                userLedger,
                authContext!,
                logger,
                drivers,
                partyAllocator
            )
            const walletSyncNeeded = await service.isWalletSyncNeeded()
            return { walletSyncNeeded }
        },
        getTransaction: async (
            params: GetTransactionParams
        ): Promise<GetTransactionResult> => {
            const transaction = await store.getTransaction(params.commandId)
            if (!transaction) {
                throw new Error(
                    `Transaction not found with commandId: ${params.commandId}`
                )
            }
            return {
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
            }
        },
        listTransactions: async function (): Promise<ListTransactionsResult> {
            const transactions = await store.listTransactions()
            const txs = transactions.map((transaction) => ({
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
            }))
            return { transactions: txs }
        },
        deleteTransaction: async (
            params: DeleteTransactionParams
        ): Promise<Null> => {
            const transaction = await store.getTransaction(params.commandId)
            if (!transaction) {
                throw new Error(
                    `Transaction not found with commandId: ${params.commandId}`
                )
            }
            if (transaction.status !== 'pending') {
                throw new Error(
                    `Cannot delete transaction with status '${transaction.status}'. Only pending transactions can be deleted.`
                )
            }
            await store.removeTransaction(params.commandId)
            return null
        },
    })
}
