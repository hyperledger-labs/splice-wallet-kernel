// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LedgerClient } from '@canton-network/core-ledger-client'
import buildController from './rpc-gen/index.js'
import {
    SigningProvider,
    type SigningDriverInterface,
} from '@canton-network/core-signing-lib'
import type { Store, Network } from '@canton-network/core-wallet-store'
import type {
    AddSessionParams,
    CreateWalletParams,
    DeleteTransactionParams,
    ExecuteParams,
    GetTransactionParams,
    GetTransactionResult,
    PublicNetwork,
    SignParams,
    Network as ApiNetwork,
    Auth,
    Status,
    UserLevelRight,
} from './rpc-gen/typings.js'
import {
    assertConnected,
    AuthTokenProvider,
    resolveAuthIdentityProviderId,
} from '@canton-network/core-wallet-auth'
import { AuthService } from '../auth-service.js'
import { createExtensionWallet } from './create-wallet.js'
import { TransactionService } from './transaction-service.js'
import {
    type INotificationService,
    LOGOUT_EVENT,
} from '@canton-network/core-wallet-services/notification'
import { notifySessionTerminated } from '../status.js'
import type { TxChangedFailedEvent } from '../dapp/rpc-gen/typings.js'

function toAuthDto(auth: Auth): ApiNetwork['auth'] {
    switch (auth.method) {
        case 'authorization_code':
            return {
                method: auth.method,
                audience: auth.audience,
                scope: auth.scope,
                clientId: auth.clientId,
            }
        case 'client_credentials':
            return {
                method: auth.method,
                ...(auth.identityProviderId
                    ? { identityProviderId: auth.identityProviderId }
                    : {}),
                audience: auth.audience,
                scope: auth.scope,
                clientId: auth.clientId,
                clientSecret: auth.clientSecret,
            }
        case 'self_signed':
            return {
                method: auth.method,
                audience: auth.audience,
                scope: auth.scope,
                clientId: auth.clientId,
                clientSecret: auth.clientSecret,
                issuer: auth.issuer,
            }
        case 'self_issued':
            return {
                method: auth.method,
                audience: auth.audience,
                scope: auth.scope,
            }
    }
}

function toNetworkDto(network: Network): ApiNetwork {
    return {
        id: network.id,
        name: network.name,
        description: network.description,
        synchronizerId: network.synchronizerId,
        identityProviderId: network.identityProviderId,
        ledgerApi: network.ledgerApi.baseUrl,
        auth: toAuthDto(network.auth),
        ...(network.adminAuth
            ? { adminAuth: toAuthDto(network.adminAuth) }
            : {}),
        ...(network.serviceAccountAuth
            ? { serviceAccountAuth: toAuthDto(network.serviceAccountAuth) }
            : {}),
    }
}

function toPublicNetwork(network: Network): PublicNetwork {
    const auth = network.auth

    return {
        id: network.id,
        name: network.name,
        description: network.description,
        synchronizerId: network.synchronizerId,
        identityProviderId: network.identityProviderId,
        ledgerApi: network.ledgerApi.baseUrl,
        authMethod: auth.method,
        ...(auth.method !== 'client_credentials' && {
            ...('clientId' in auth ? { clientId: auth.clientId } : {}),
            scope: auth.scope,
            audience: auth.audience,
        }),
    }
}

export const userController = (
    getStore: () => Promise<Store>,
    signingDriver: SigningDriverInterface,
    notificationService: INotificationService
) => {
    return buildController({
        addNetwork: async () => {
            throw new Error('Function addNetwork not implemented.')
        },
        removeNetwork: async () => {
            throw new Error('Function removeNetwork not implemented.')
        },
        listNetworks: async () => {
            const store = await getStore()
            const networks = await store.listNetworks()
            return { networks: networks.map(toPublicNetwork) }
        },
        getNetwork: async () => {
            throw new Error('Function getNetwork not implemented.')
        },
        selfSignedAccessToken: async () => {
            throw new Error('Function selfSignedAccessToken not implemented.')
        },
        addIdp: async () => {
            throw new Error('Function addIdp not implemented.')
        },
        removeIdp: async () => {
            throw new Error('Function removeIdp not implemented.')
        },
        listIdps: async () => {
            const store = await getStore()
            return { idps: await store.listIdps() }
        },
        createWallet: async (params: CreateWalletParams) => {
            const authContext = assertConnected(
                await AuthService.loadAuthContext()
            )
            const store = await getStore()
            const network = await store.getCurrentNetwork()

            if (
                params.signingProviderId !== SigningProvider.WALLET_KERNEL ||
                signingDriver.signingProvider !== SigningProvider.WALLET_KERNEL
            ) {
                throw new Error(
                    `Signing provider ${params.signingProviderId} not supported`
                )
            }
            if (!network.adminAuth) {
                throw new Error('No admin auth configured')
            }

            const idp = await store.getIdp(
                resolveAuthIdentityProviderId(
                    network.adminAuth,
                    network.identityProviderId
                )
            )
            const adminTokenProvider = AuthTokenProvider.fromGatewayConfig(
                idp,
                network.adminAuth,
                pinoLogger
            )
            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger: pinoLogger,
                accessTokenProvider: adminTokenProvider,
            })
            const wallet = await createExtensionWallet({
                authContext,
                ledgerClient,
                networkId: network.id,
                partyHint: params.partyHint,
                primary: params.primary ?? false,
                signingDriver,
                store,
                synchronizerId: network.synchronizerId,
            })

            notificationService
                .getNotifier(authContext.userId)
                .emit('accountsChanged', await store.getWallets())

            return { wallet }
        },
        addSelfIssuedSession: async () => {
            throw new Error('Function addSelfIssuedSession not implemented.')
        },
        getSelfIssuedOnboarding: async () => {
            throw new Error('Function getSelfIssuedOnboarding not implemented.')
        },
        createSelfIssuedWallet: async () => {
            throw new Error('Function createSelfIssuedWallet not implemented.')
        },
        allocateSelfIssuedWallet: async () => {
            throw new Error(
                'Function allocateSelfIssuedWallet not implemented.'
            )
        },
        connectSelfIssuedSession: async () => {
            throw new Error(
                'Function connectSelfIssuedSession not implemented.'
            )
        },
        allocatePartyForWallet: async () => {
            throw new Error('Function allocatePartyForWallet not implemented.')
        },
        setPrimaryWallet: async () => {
            throw new Error('Function setPrimaryWallet not implemented.')
        },
        removeWallet: async () => {
            throw new Error('Function removeWallet not implemented.')
        },
        listWallets: async (params: {
            filter?: { signingProviderIds?: string[] }
        }) => {
            const store = await getStore()
            return await store.getWallets(params.filter)
        },
        syncWallets: async () => {
            throw new Error('Function syncWallets not implemented.')
        },
        isWalletSyncNeeded: async () => {
            throw new Error('Function isWalletSyncNeeded not implemented.')
        },
        sign: async (signParams: SignParams) => {
            const connectedContext = assertConnected(
                await AuthService.loadAuthContext()
            )
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

            const session = await store.getSession(connectedContext.accessToken)
            if (!session) {
                throw new Error('No active session found')
            }

            const transactionService = new TransactionService(
                store,
                pinoLogger,
                signingDriver,
                notificationService.getNotifier(session.id)
            )

            pinoLogger.info(
                { transactionId: signParams.transactionId },
                'Signing transaction'
            )
            const response = await transactionService.sign(
                connectedContext,
                wallet,
                signParams
            )
            pinoLogger.info(
                { transactionId: signParams.transactionId },
                'Transaction signed'
            )

            return response
        },
        signMessage: async () => {
            throw new Error('Function signMessage not implemented.')
        },
        getMessageToSign: async () => {
            throw new Error('Function getMessageToSign not implemented.')
        },
        listMessagesToSign: async () => {
            throw new Error('Function listMessagesToSign not implemented.')
        },
        deleteMessageToSign: async () => {
            throw new Error('Function deleteMessageToSign not implemented.')
        },
        execute: async (executeParams: ExecuteParams) => {
            const connectedContext = assertConnected(
                await AuthService.loadAuthContext()
            )
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

            const session = await store.getSession(connectedContext.accessToken)
            if (!session) {
                throw new Error('No active session found')
            }

            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger: pinoLogger,
                accessTokenProvider: AuthTokenProvider.fromToken(
                    connectedContext.accessToken,
                    pinoLogger
                ),
            })
            const transactionService = new TransactionService(
                store,
                pinoLogger,
                signingDriver,
                notificationService.getNotifier(session.id)
            )

            pinoLogger.info(
                { transactionId: executeParams.transactionId },
                'Executing transaction'
            )
            const response = await transactionService.execute(
                connectedContext.userId,
                wallet,
                transaction,
                executeParams,
                ledgerClient
            )
            pinoLogger.info(
                { transactionId: executeParams.transactionId },
                'Transaction executed'
            )

            return response
        },
        addSession: async (params: AddSessionParams) => {
            const context = await AuthService.loadAuthContext()
            if (!context) {
                throw new Error(
                    'No auth context found. User must be authenticated to add a session.'
                )
            }
            const store = await getStore()
            const newSessionId = crypto.randomUUID()

            logger.info(
                `Adding session with ID ${newSessionId} for network ${params.networkId}`
            )

            const network = await store.getNetwork(params.networkId)
            const idp = await store.getIdp(network.identityProviderId)
            // assertTokenClaimsMatchNetwork(accessToken, network, idp)

            // setSession replaces the origin's authenticated sessions; look
            // them up first so their notification ports can be closed.
            const replacedSessions = (await store.listSessions()).filter(
                (session) =>
                    session.origin === params.origin && session.accessToken
            )

            await store.setSession({
                id: newSessionId,
                origin: params.origin,
                network: params.networkId,
                accessToken: context.accessToken,
            })

            // The content script reopens its port, bound to the new session,
            // on the next connected `connect`/`status` response.
            for (const session of replacedSessions) {
                notificationService.getNotifier(session.id).emit(LOGOUT_EVENT)
            }

            // TODO: fill in
            const status = {} as Status
            const rights = {} as UserLevelRight

            return {
                id: newSessionId,
                network: toNetworkDto(network),
                idp,
                accessToken: context.accessToken,
                status,
                rights,
            }
        },
        removeSession: async () => {
            const context = await AuthService.loadAuthContext()
            if (!context) {
                return null
            }

            try {
                const store = await getStore()
                const session = await store.getSession(context.accessToken)
                await store.removeSession(context.accessToken)

                if (session) {
                    notifySessionTerminated(
                        notificationService,
                        session.id,
                        'removed session'
                    )
                }
            } finally {
                await AuthService.clearAuthContext()
            }

            return null
        },
        listSessions: async () => {
            const context = await AuthService.loadAuthContext()
            if (!context) {
                throw new Error(
                    'No auth context found. User must be authenticated to list sessions.'
                )
            }
            const store = await getStore()
            const sessions = await store.listSessions()

            return {
                sessions: await Promise.all(
                    sessions.map(async (session) => {
                        const network = await store.getNetwork(session.network)
                        const idp = await store.getIdp(
                            network.identityProviderId
                        )

                        return {
                            id: session.id,
                            origin: session.origin,
                            network: toNetworkDto(network),
                            idp,
                            accessToken: context.accessToken,
                            status: {} as Status,
                            rights: {} as UserLevelRight,
                        }
                    })
                ),
            }
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
            }
        },
        listTransactions: async () => {
            throw new Error('Function listTransactions not implemented.')
        },
        deleteTransaction: async (
            params: DeleteTransactionParams
        ): Promise<null> => {
            const connectedContext = assertConnected(
                await AuthService.loadAuthContext()
            )
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

            const session = await store.getSession(connectedContext.accessToken)
            if (!session) {
                throw new Error('No active session found')
            }

            await store.removeTransaction(transaction.id)
            notificationService.getNotifier(session.id).emit('txChanged', {
                status: 'failed',
                commandId: transaction.commandId,
            } satisfies TxChangedFailedEvent)
            return null
        },
        getUser: async () => {
            throw new Error('Function getUser not implemented.')
        },
        generateApiKey: async () => {
            throw new Error('Function generateApiKey not implemented.')
        },
        listApiKeys: async () => {
            throw new Error('Function listApiKeys not implemented.')
        },
        removeApiKey: async () => {
            throw new Error('Function removeApiKey not implemented.')
        },
        listSigningProviderVaults: async () => {
            throw new Error(
                'Function listSigningProviderVaults not implemented.'
            )
        },
    })
}
