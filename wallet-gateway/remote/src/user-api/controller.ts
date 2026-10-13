// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Disabled unused vars rule to allow for future implementations
/* eslint-disable @typescript-eslint/no-unused-vars */
import { LedgerClient } from '@canton-network/core-ledger-client'
import buildController from './rpc-gen/index.js'
import type {
    AddNetworkParams,
    RemoveNetworkParams,
    ExecuteParams,
    SignParams,
    SignMessageParams,
    SignMessageResult,
    GetMessageToSignParams,
    GetMessageToSignResult,
    ListMessagesToSignResult,
    DeleteMessageToSignParams,
    AddSessionParams,
    AddSessionResult,
    ListSessionsResult,
    SetPrimaryWalletParams,
    SyncWalletsResult,
    IsWalletSyncNeededResult,
    AddIdpParams,
    RemoveIdpParams,
    CreateWalletParams,
    AddSelfIssuedSessionParams,
    GetSelfIssuedOnboardingParams,
    CreateSelfIssuedWalletParams,
    AllocateSelfIssuedWalletParams,
    ConnectSelfIssuedSessionParams,
    AllocatePartyForWalletParams,
    GetTransactionResult,
    GetTransactionParams,
    DeleteTransactionParams,
    Null,
    ListTransactionsResult,
    GetUserResult,
    GetNetworkParams,
    GetNetworkResult,
    SelfSignedAccessTokenParams,
    SelfSignedAccessTokenResult,
    Network as ApiNetwork,
    PublicNetwork,
    GenerateApiKeyParams,
    GeneratedApiKey,
    ListApiKeysResult,
    RemoveApiKeyParams,
    ListTransactionsParams,
    ChangeSigningProviderParams,
    GetWalletParams,
    GetWalletResult,
    ListSigningProviderKeysParams,
    ListSigningProviderKeysResult,
    GetTransactionStatusParams,
    GetTransactionStatusResult,
} from './rpc-gen/typings.js'
import type { Store, Network } from '@canton-network/core-wallet-store'
import type { Logger } from 'pino'
import {
    assertConnected,
    type AuthContext,
    type AuthAware,
    authSchema,
    type Auth,
    AuthTokenProvider,
    idpSchema,
    resolveAuthIdentityProviderId,
    assertIsConnected,
} from '@canton-network/core-wallet-auth'
import type { KernelInfo } from '../config/Config.js'
import { isRpcError, SigningProvider } from '@canton-network/core-signing-lib'
import { PartyAllocationService } from '../ledger/party-allocation-service.js'
import { WalletAllocationService } from '../ledger/wallet-allocation/wallet-allocation-service.js'
import { WalletSyncService } from '../ledger/wallet-sync-service.js'
import { v4 } from 'uuid'
import {
    assertSelfIssuedOnboardingAllowed,
    createSelfIssuedAuthService,
    type SelfIssuedOnboardingSession,
} from '../ledger/self-issued-auth-service.js'
import type { StatusEvent } from '../dapp-api/rpc-gen/typings.js'
import type {
    MessageSignatureEvent,
    TxChangedFailedEvent,
} from '../dapp-api/rpc-gen/typings.js'
import { providerErrors, rpcErrors } from '@canton-network/core-rpc-errors'
import crypto from 'crypto'
import { assertTokenClaimsMatchNetwork } from './token-network-matching.js'
import {
    TransactionService,
    logDynamically,
    networkStatus,
    type HASHING_SCHEME_VERSION,
    type NotificationService,
    type SigningDrivers,
} from '@canton-network/core-wallet-services'

export const userController = (
    kernelInfo: KernelInfo,
    userUrl: string,
    store: Store,
    notificationService: NotificationService,
    authContext: AuthContext | undefined,
    drivers: SigningDrivers,
    _logger: Logger,
    hashingSchemeVersion: HASHING_SCHEME_VERSION,
    adminUserId?: string
) => {
    const logger = _logger.child({ component: 'user-controller' })
    const provider = {
        id: kernelInfo.id,
        version: 'TODO',
        providerType: kernelInfo.clientType,
        userUrl: `${userUrl}/login/`,
    }

    function isAdmin(): boolean {
        const userId = authContext?.userId
        return !!adminUserId && !!userId && userId === adminUserId
    }

    function assertAdmin(): void {
        assertIsConnected(authContext)
        if (!adminUserId || authContext.userId !== adminUserId) {
            throw new Error(
                'Unauthorized: only the admin user can perform this operation'
            )
        }
    }

    function requireOnboardingSession(): SelfIssuedOnboardingSession {
        if (!authContext || authContext.isApiKey || !authContext.sessionId) {
            throw new Error('No onboarding session found')
        }
        return {
            userId: authContext.userId,
            sessionId: authContext.sessionId,
        }
    }

    async function emitSessionConnected(
        sessionId: string,
        network: Network,
        { userId, accessToken }: { userId: string; accessToken: string },
        ledgerClient: LedgerClient
    ) {
        const status = await networkStatus(ledgerClient)
        const statusEvent: StatusEvent = {
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
                accessToken: accessToken,
                userId: userId,
            },
        }
        const notifier = notificationService.getNotifier(sessionId)
        notifier.emit('statusChanged', statusEvent)
        notifier.emit('connected', statusEvent)
        return status
    }

    async function getIdpForAuth(network: Network, auth: Auth) {
        return await store.getIdp(
            resolveAuthIdentityProviderId(auth, network.identityProviderId)
        )
    }

    /**
     * Session responses always include user auth for the UI.
     * Privileged credentials are included only for the admin user.
     */
    function toSessionNetwork(network: Network): ApiNetwork {
        const dto = toNetworkDto(network)
        if (isAdmin()) {
            return dto
        }
        const { adminAuth: _adminAuth, serviceAccountAuth: _sa, ...rest } = dto
        return rest
    }

    const authAwareStore = store as Store & AuthAware<Store>

    const getSigningProviderKeys = async (
        params: ListSigningProviderKeysParams
    ) => {
        const network = await store.getCurrentNetwork()
        if (!network.adminAuth) {
            throw new Error('No admin auth configured')
        }
        const idp = await getIdpForAuth(network, network.adminAuth)

        const adminAccessTokenProvider = AuthTokenProvider.fromGatewayConfig(
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
        const walletAllocationService = new WalletAllocationService(
            store,
            logger,
            partyAllocator,
            drivers
        )
        if (!drivers[params.signingProviderId as SigningProvider])
            throw new Error(
                `Signing provider ${params.signingProviderId} not supported`
            )
        const keys = await walletAllocationService.getKeys(
            assertConnected(authContext),
            params.signingProviderId as SigningProvider
        )
        if (!keys)
            throw new Error(`No keys ofr ${params.signingProviderId} found`)
        return keys
    }

    return buildController({
        getUser: async (): Promise<GetUserResult> => {
            assertIsConnected(authContext)
            return {
                userId: authContext.userId,
                isAdmin: isAdmin(),
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
            const serviceAccountAuth = network.serviceAccountAuth
                ? authSchema.parse(network.serviceAccountAuth)
                : undefined

            const newNetwork: Network = {
                name: network.name,
                id: network.id,
                description: network.description,
                synchronizerId: network.synchronizerId,
                identityProviderId: network.identityProviderId,
                auth,
                adminAuth,
                serviceAccountAuth,
                ledgerApi,
            }

            const referencedIdentityProviderIds = new Set([
                newNetwork.identityProviderId,
                ...[
                    newNetwork.auth,
                    newNetwork.adminAuth,
                    newNetwork.serviceAccountAuth,
                ].flatMap((auth) =>
                    auth?.method === 'client_credentials' &&
                    auth.identityProviderId
                        ? [auth.identityProviderId]
                        : []
                ),
            ])
            const configuredIdentityProviderIds = new Set(
                (await store.listIdps()).map((idp) => idp.id)
            )
            const missingIdentityProviderId = [
                ...referencedIdentityProviderIds,
            ].find((id) => !configuredIdentityProviderIds.has(id))
            if (missingIdentityProviderId) {
                throw new Error(
                    `Identity provider "${missingIdentityProviderId}" not found`
                )
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
        listNetworks: async () => {
            const networks = await store.listNetworks()
            return {
                networks: networks.map(toPublicNetwork),
            }
        },
        getNetwork: async (
            params: GetNetworkParams
        ): Promise<GetNetworkResult> => {
            assertAdmin()
            const network = await store.getNetwork(params.networkId)
            return { network: toNetworkDto(network) }
        },
        selfSignedAccessToken: async (
            params: SelfSignedAccessTokenParams
        ): Promise<SelfSignedAccessTokenResult> => {
            const network = (await store.listNetworks()).find(
                (n) => n.id === params.networkId
            )
            if (!network) {
                throw new Error(`Network "${params.networkId}" not found`)
            }
            const auth = network.auth

            if (auth.method !== 'self_signed') {
                throw new Error(
                    'Network does not use self_signed authentication'
                )
            }

            const clientSecretMatch = crypto.timingSafeEqual(
                crypto
                    .createHash('sha256')
                    .update(params.clientSecret, 'utf8')
                    .digest(),
                crypto
                    .createHash('sha256')
                    .update(auth.clientSecret, 'utf8')
                    .digest()
            )
            if (!clientSecretMatch) {
                throw providerErrors.unauthorized({
                    message: 'Invalid client secret',
                })
            }

            const idp = (await store.listIdps()).find(
                (idp) => idp.id === network.identityProviderId
            )
            if (!idp) {
                throw new Error(
                    `Identity provider "${network.identityProviderId}" not found`
                )
            }
            if (idp.type !== 'self_signed') {
                throw new Error(
                    'Identity provider is not configured for self_signed authentication'
                )
            }

            const accessToken = await new AuthTokenProvider(
                {
                    method: 'self_signed',
                    issuer: idp.issuer,
                    keyId: network.id,
                    credentials: {
                        clientId: params.clientId,
                        clientSecret: auth.clientSecret,
                        scope: auth.scope,
                        audience: auth.audience,
                    },
                },
                logger
            ).getAccessToken()

            return { accessToken }
        },
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
        listIdps: async () => ({ idps: await store.listIdps() }),
        createWallet: async (params: CreateWalletParams) => {
            const { signingProviderId, primary, partyHint } = params

            assertIsConnected(authContext)
            const network = await store.getCurrentNetwork()
            if (network === undefined) {
                throw new Error('No network session found')
            }
            if (!network.adminAuth) {
                throw new Error('No admin auth configured')
            }
            const idp = await getIdpForAuth(network, network.adminAuth)

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
                authContext,
                partyHint,
                primary ?? false,
                signingProviderId as SigningProvider,
                params.keyName
            )

            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger,
                accessTokenProvider: AuthTokenProvider.fromToken(
                    authContext!.accessToken,
                    logger
                ),
            })
            const service = new WalletSyncService(
                store,
                ledgerClient,
                authContext!,
                logger
            )
            await service.syncRights()

            // Notify about the change and return the new wallet
            const wallets = await store.getWallets()
            notificationService
                .getNotifier(authContext.userId)
                .emit('accountsChanged', wallets)

            const walletWithUpdatedRights = wallets.find(
                (w) =>
                    w.partyId === wallet.partyId && w.networkId === network.id
            )
            return { wallet: walletWithUpdatedRights ?? wallet }
        },
        addSelfIssuedSession: async (params: AddSelfIssuedSessionParams) => {
            const username = params.username.trim()
            if (!username) {
                throw new Error('username is required')
            }

            const network = await authAwareStore.getNetwork(params.networkId)
            if (network.auth.method !== 'self_issued') {
                throw new Error(
                    'Network does not use self_issued authentication'
                )
            }

            const onboardingStore = authAwareStore.withAuthContext({
                userId: username,
                accessToken: '',
            })
            await assertSelfIssuedOnboardingAllowed(
                authAwareStore,
                network,
                username,
                logger
            )
            const sessionId = v4()
            await onboardingStore.setSession({
                id: sessionId,
                origin: params.origin,
                network: network.id,
            })

            return { sessionId }
        },
        getSelfIssuedOnboarding: async (
            _params: GetSelfIssuedOnboardingParams
        ) => {
            const service = await createSelfIssuedAuthService(
                authAwareStore,
                requireOnboardingSession(),
                drivers,
                logger
            )
            return service.getOnboardingState()
        },
        createSelfIssuedWallet: async (
            params: CreateSelfIssuedWalletParams
        ) => {
            const { signingProviderId } = params
            if (!drivers[signingProviderId as SigningProvider]) {
                throw new Error(
                    `Signing provider ${signingProviderId} not supported`
                )
            }

            const service = await createSelfIssuedAuthService(
                authAwareStore,
                requireOnboardingSession(),
                drivers,
                logger
            )
            const wallet = await service.createWallet({
                partyHint: params.partyHint,
                signingProviderId: signingProviderId as SigningProvider,
            })
            return { wallet }
        },
        allocateSelfIssuedWallet: async (
            params: AllocateSelfIssuedWalletParams
        ) => {
            const service = await createSelfIssuedAuthService(
                authAwareStore,
                requireOnboardingSession(),
                drivers,
                logger
            )
            const allocated = await service.allocateParty({
                partyId: params.partyId,
            })
            return { wallet: allocated }
        },
        connectSelfIssuedSession: async (
            params: ConnectSelfIssuedSessionParams
        ) => {
            const onboardingSession = requireOnboardingSession()
            const service = await createSelfIssuedAuthService(
                authAwareStore,
                onboardingSession,
                drivers,
                logger
            )
            const { wallet, accessToken, session } =
                await service.connectSession({
                    partyId: params.partyId,
                })
            const connectedContext = {
                userId: onboardingSession.userId,
                accessToken,
            }
            const scopedStore = authAwareStore.withAuthContext(connectedContext)
            const network = await scopedStore.getCurrentNetwork()
            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger,
                accessTokenProvider: AuthTokenProvider.fromToken(
                    accessToken,
                    logger
                ),
            })
            await emitSessionConnected(
                session.id,
                network,
                connectedContext,
                ledgerClient
            )
            return { wallet, accessToken, sessionId: session.id }
        },
        allocatePartyForWallet: async (
            params: AllocatePartyForWalletParams
        ) => {
            assertIsConnected(authContext)

            const network = await store.getCurrentNetwork()
            if (!network) {
                throw new Error('No network session found')
            }
            if (!network.adminAuth) {
                throw new Error('No admin auth configured')
            }

            const allWallets = await store.getWallets()
            const existingWallet = allWallets.find(
                (w) =>
                    w.partyId === params.partyId && w.networkId === network.id
            )
            if (!existingWallet) {
                throw new Error(`Wallet not found for party ${params.partyId}`)
            }

            const idp = await getIdpForAuth(network, network.adminAuth)
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
                authContext,
                existingWallet,
                signingProviderId
            )

            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger,
                accessTokenProvider: AuthTokenProvider.fromToken(
                    authContext!.accessToken,
                    logger
                ),
            })
            const service = new WalletSyncService(
                store,
                ledgerClient,
                authContext!,
                logger
            )
            await service.syncRights()

            // Notify about the change and return the updated wallet
            const wallets = await store.getWallets()
            const wallet = wallets.find(
                (w) =>
                    w.partyId === existingWallet.partyId &&
                    w.networkId === network.id
            )!

            notificationService
                .getNotifier(authContext.userId)
                .emit('accountsChanged', wallets)

            return { wallet }
        },
        setPrimaryWallet: async (params: SetPrimaryWalletParams) => {
            await store.setPrimaryWallet(params.partyId)
            const wallets = await store.getWallets()

            notificationService
                .getNotifier(authContext!.userId)
                .emit('accountsChanged', wallets)

            return null
        },
        removeWallet: async (params: { partyId: string }) => {
            throw rpcErrors.methodNotSupported()
        },
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
                throw new Error(
                    `No wallet found for partyId ${signParams.partyId}`
                )
            }

            assertIsConnected(authContext)

            const session = await store.getSession(authContext.accessToken)
            if (!session) {
                throw new Error('No active session found')
            }
            const notifier = notificationService.getNotifier(session.id)

            const transactionService = new TransactionService(
                store,
                logger,
                drivers,
                notifier,
                hashingSchemeVersion
            )

            logDynamically(logger, 'signing transaction with params', {
                info: { transactionId: signParams.transactionId },
                debug: { signParams, wallet, authContext },
            })

            const response = await transactionService.sign(
                authContext,
                wallet,
                signParams
            )

            logDynamically(logger, 'transaction signed with response', {
                info: { transactionId: signParams.transactionId },
                debug: { response },
            })

            return response
        },
        signMessage: async (
            params: SignMessageParams
        ): Promise<SignMessageResult> => {
            const pending = await store.getMessageRaw(params.messageId)
            if (!pending) {
                throw new Error(
                    `Message signing request not found with id: ${params.messageId}`
                )
            }
            if (pending.status !== 'pending') {
                throw new Error(
                    `Cannot sign message with status '${pending.status}'. Only pending messages can be signed.`
                )
            }

            assertIsConnected(authContext)
            const userId = authContext.userId
            if (pending.userId !== userId) {
                throw new Error(
                    `Message signing request ${pending.id} is not owned by user ${userId}`
                )
            }

            const session = await store.getSession(authContext.accessToken)
            if (!session) {
                throw new Error('No active session found')
            }
            const notifier = notificationService.getNotifier(session.id)

            const emitFailedAndPersist = async (
                details: string
            ): Promise<never> => {
                // Best-effort: make sure listeners see a terminal state.
                try {
                    await store.setMessageRawStatus(pending.id, 'failed')
                } catch {
                    // ignore (e.g. record removed concurrently)
                }
                notifier.emit('messageSignature', {
                    status: 'failed',
                    messageId: pending.id,
                } satisfies MessageSignatureEvent)
                // Preserve the original error message for the caller/UI.
                throw new Error(details)
            }

            const wallet = (await store.getWallets()).find(
                (w) => w.partyId === pending.partyId
            )
            if (!wallet) {
                return await emitFailedAndPersist(
                    `No wallet found for partyId ${pending.partyId} (from message request ${pending.id})`
                )
            }
            if (wallet.publicKey !== pending.publicKey) {
                return await emitFailedAndPersist(
                    `Wallet public key changed for partyId ${pending.partyId}; refusing to sign message request ${pending.id}`
                )
            }

            // TODO: support other signing providers
            if (wallet.signingProviderId !== SigningProvider.WALLET_KERNEL) {
                return await emitFailedAndPersist(
                    `signMessage is only supported for ${SigningProvider.WALLET_KERNEL} wallets, got ${wallet.signingProviderId}`
                )
            }

            const driver =
                drivers[SigningProvider.WALLET_KERNEL]?.controller(userId)
            if (!driver) {
                return await emitFailedAndPersist(
                    'Wallet Kernel signing driver not available'
                )
            }

            const result = await driver.signMessage({
                message: pending.message,
                keyIdentifier: { publicKey: wallet.publicKey },
            })

            if (isRpcError(result)) {
                await store.setMessageRawStatus(pending.id, 'failed')
                notifier.emit('messageSignature', {
                    status: 'failed',
                    messageId: pending.id,
                } satisfies MessageSignatureEvent)
                throw new Error(result.error_description)
            }

            if (!result?.signature) {
                await store.setMessageRawStatus(pending.id, 'failed')
                notifier.emit('messageSignature', {
                    status: 'failed',
                    messageId: pending.id,
                } satisfies MessageSignatureEvent)
                throw new Error(`signMessage failed`)
            }

            await store.setMessageRawStatus(pending.id, 'signed', {
                signedAt: new Date(),
                signature: result.signature,
            })

            notifier.emit('messageSignature', {
                status: 'signed',
                messageId: pending.id,
                signature: result.signature,
            } satisfies MessageSignatureEvent)

            return {
                signature: result.signature,
                publicKey: wallet.publicKey,
            }
        },
        getMessageToSign: async (
            params: GetMessageToSignParams
        ): Promise<GetMessageToSignResult> => {
            const message = await store.getMessageRaw(params.messageId)
            if (!message) {
                throw new Error(
                    `Message signing request not found with id: ${params.messageId}`
                )
            }
            return {
                message: {
                    id: message.id,
                    status: message.status,
                    partyId: message.partyId,
                    publicKey: message.publicKey,
                    message: message.message,
                    ...(message.origin !== null && { origin: message.origin }),
                    ...(message.createdAt && {
                        createdAt: message.createdAt.toISOString(),
                    }),
                    ...(message.signedAt && {
                        signedAt: message.signedAt.toISOString(),
                    }),
                    ...(message.signature && { signature: message.signature }),
                },
            }
        },
        listMessagesToSign: async (): Promise<ListMessagesToSignResult> => {
            const messages = await store.listMessageRaws()
            return {
                messages: messages.map((message) => ({
                    id: message.id,
                    status: message.status,
                    partyId: message.partyId,
                    publicKey: message.publicKey,
                    message: message.message,
                    ...(message.origin !== null && { origin: message.origin }),
                    ...(message.createdAt && {
                        createdAt: message.createdAt.toISOString(),
                    }),
                    ...(message.signedAt && {
                        signedAt: message.signedAt.toISOString(),
                    }),
                    ...(message.signature && { signature: message.signature }),
                })),
            }
        },
        deleteMessageToSign: async (
            params: DeleteMessageToSignParams
        ): Promise<Null> => {
            const message = await store.getMessageRaw(params.messageId)
            if (!message) {
                throw new Error(
                    `Message signing request not found with id: ${params.messageId}`
                )
            }
            if (message.status !== 'pending') {
                throw new Error(
                    `Cannot delete message with status '${message.status}'. Only pending messages can be deleted.`
                )
            }
            assertIsConnected(authContext)
            const userId = authContext.userId
            if (message.userId !== userId) {
                throw new Error(
                    `Message signing request ${message.id} is not owned by user ${userId}`
                )
            }
            await store.removeMessageRaw(message.id)

            const session = await store.getSession(authContext.accessToken)
            if (session) {
                notificationService
                    .getNotifier(session.id)
                    .emit('messageSignature', {
                        status: 'failed',
                        messageId: message.id,
                    } satisfies MessageSignatureEvent)
            }
            return null
        },
        execute: async (executeParams: ExecuteParams) => {
            const wallets = await store.getWallets()
            const network = await store.getCurrentNetwork()
            const transaction = await store.getTransaction(
                executeParams.transactionId
            )
            const wallet = wallets.find(
                (w) => w.partyId === executeParams.partyId
            )

            if (wallet === undefined) {
                throw new Error('Requested wallet not found for user')
            }

            if (transaction === undefined) {
                throw new Error('No transaction found')
            }

            assertIsConnected(authContext)
            const accessTokenProvider: AuthTokenProvider =
                AuthTokenProvider.fromToken(authContext.accessToken, logger)

            if (network === undefined) {
                throw new Error('No network session found')
            }

            const session = await store.getSession(authContext.accessToken)
            if (!session) {
                throw new Error('No active session found')
            }
            const notifier = notificationService.getNotifier(session.id)

            const ledgerClient = new LedgerClient({
                baseUrl: new URL(network.ledgerApi.baseUrl),
                logger,
                accessTokenProvider,
            })

            const transactionService = new TransactionService(
                store,
                logger,
                drivers,
                notifier,
                hashingSchemeVersion
            )

            logDynamically(logger, 'executing transaction with params', {
                info: { transactionId: executeParams.transactionId },
                debug: {
                    executeParams,
                    transaction,
                    wallet,
                    userId: authContext.userId,
                },
            })

            const response = await transactionService.execute(
                authContext.userId,
                wallet,
                transaction,
                executeParams,
                ledgerClient,
                authContext,
                network
            )

            logDynamically(logger, 'transaction executed with response', {
                info: { transactionId: executeParams.transactionId },
                debug: { response },
            })

            return response
        },
        addSession: async function (
            params: AddSessionParams
        ): Promise<AddSessionResult> {
            try {
                assertIsConnected(authContext)
                const { accessToken } = authContext

                const newSessionId = v4()

                logger.info(
                    `Adding session with ID ${newSessionId} for network ${params.networkId}`
                )
                const network = await store.getNetwork(params.networkId)
                const idp = await store.getIdp(network.identityProviderId)

                assertTokenClaimsMatchNetwork(accessToken, network, idp)

                await store.setSession({
                    id: newSessionId,
                    origin: params.origin,
                    network: params.networkId,
                    accessToken: accessToken || '',
                })

                const ledgerClient = new LedgerClient({
                    baseUrl: new URL(network.ledgerApi.baseUrl),
                    logger,
                    accessTokenProvider: AuthTokenProvider.fromToken(
                        accessToken,
                        logger
                    ),
                })
                const status = await emitSessionConnected(
                    newSessionId,
                    network,
                    authContext,
                    ledgerClient
                )

                // Only bootstrap wallets the first time a session is created.
                // Session creation must remain successful when the ledger or
                // wallet synchronization is unavailable.
                const wallets = await store.getWallets()
                if (wallets.length === 0) {
                    if (!status.isConnected) {
                        logger.warn(
                            {
                                networkId: network.id,
                                reason: status.reason,
                            },
                            'Skipping initial wallet sync because the ledger is unavailable'
                        )
                    } else {
                        try {
                            if (!network.adminAuth) {
                                throw new Error('No admin auth configured')
                            }

                            const adminIdp = await getIdpForAuth(
                                network,
                                network.adminAuth
                            )
                            const adminAccessTokenProvider =
                                AuthTokenProvider.fromGatewayConfig(
                                    adminIdp,
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
                                authContext,
                                logger,
                                drivers,
                                partyAllocator
                            )
                            await service.syncWallets()
                        } catch (error) {
                            logger.warn(
                                { err: error, networkId: network.id },
                                'Initial wallet sync failed; keeping session active'
                            )
                        }
                    }
                }

                const rights = await store.getUserRights(network.id)
                return {
                    id: newSessionId,
                    accessToken,
                    network: toSessionNetwork(network),
                    idp,
                    status: status.isConnected ? 'connected' : 'disconnected',
                    reason: status.reason ? status.reason : 'OK',
                    rights: rights,
                }
            } catch (error) {
                logger.error(error, 'Failed to add session')
                throw new Error(`Failed to add session`, {
                    cause: error,
                })
            }
        },
        removeSession: async (): Promise<Null> => {
            logger.info({ authContext }, 'Removing session')
            const { accessToken } = assertConnected(authContext)

            const session = await store.getSession(accessToken)
            if (!session) {
                return null
            }
            const notifier = notificationService.getNotifier(session.id)

            await store.removeSession(accessToken)

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
            notifier.emit('logout')

            return null
        },
        // TODO: follow up with store.listSessions to display all sessions in the UI
        listSessions: async (): Promise<ListSessionsResult> => {
            const token = authContext!.accessToken
            const session = await store.getSession(token)

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
                        origin: session.origin,
                        network: toSessionNetwork(network),
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

            if (!network.adminAuth) {
                throw new Error('No admin auth configured')
            }
            const idp = await getIdpForAuth(network, network.adminAuth)

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

            const wallets = await store.getWallets()
            notificationService
                .getNotifier(userId)
                .emit('accountsChanged', wallets)

            return result
        },
        isWalletSyncNeeded: async (): Promise<IsWalletSyncNeededResult> => {
            const network = await store.getCurrentNetwork()
            assertConnected(authContext)

            const userAccessTokenProvider = AuthTokenProvider.fromToken(
                authContext!.accessToken,
                logger
            )

            if (!network.adminAuth) {
                throw new Error('No admin auth configured')
            }
            const idp = await getIdpForAuth(network, network.adminAuth)

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
        listTransactions: async function (
            params?: ListTransactionsParams
        ): Promise<ListTransactionsResult> {
            const txCount = await store.transactionsCount()
            const page = await store.listTransactions(params)
            const transactions = page.transactions
            const txs = transactions.map((transaction) => ({
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
            }))

            if (page.nextCursor === null) {
                return { transactions: txs, count: txCount }
            } else {
                return {
                    transactions: txs,
                    nextCursor: page.nextCursor,
                    count: txCount,
                }
            }
        },
        deleteTransaction: async (
            params: DeleteTransactionParams
        ): Promise<Null> => {
            const transaction = await store.getTransaction(params.transactionId)
            if (!transaction) {
                throw new Error(
                    `Transaction not found with id: ${params.transactionId}`
                )
            }
            if (
                transaction.status !== 'pending' &&
                transaction.status !== 'awaiting-signature'
            ) {
                throw new Error(
                    `Cannot delete transaction with status '${transaction.status}'. Only pending transactions can be deleted.`
                )
            }
            const session = await store.getSession(
                assertConnected(authContext).accessToken
            )
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
        generateApiKey: async (
            params: GenerateApiKeyParams
        ): Promise<GeneratedApiKey> => {
            const userId = assertConnected(authContext).userId
            const network = await store.getCurrentNetwork()

            const apiKeyId = v4()
            const generatedApiKey = crypto.randomBytes(32).toString('hex')
            const hashedApiKey = crypto
                .createHash('sha256')
                .update(generatedApiKey)
                .digest('hex')

            const storedApiKey = {
                id: apiKeyId,
                name: params.name,
                digest: hashedApiKey,
                userId,
                networkId: network.id,
                email: authContext?.email || null,
                createdAt: new Date(),
            }

            await store.addApiKey(storedApiKey)

            logDynamically(logger, 'Generated new API key', {
                info: { apiKeyId: storedApiKey.id },
                debug: {
                    name: storedApiKey.name,
                    userId: storedApiKey.userId,
                    networkId: storedApiKey.networkId,
                    createdAt: storedApiKey.createdAt,
                },
            })

            return {
                id: storedApiKey.id,
                apiKey: generatedApiKey,
            }
        },
        listApiKeys: async (): Promise<ListApiKeysResult> => {
            const apiKeys = await store.listApiKeys().then((keys) =>
                keys.map((key) => ({
                    id: key.id,
                    name: key.name,
                    createdAt: key.createdAt.toISOString(),
                }))
            )
            return { apiKeys }
        },
        removeApiKey: async (params: RemoveApiKeyParams): Promise<Null> => {
            await store.removeApiKey(params.id)
            return null
        },
        listSigningProviderKeys: async (
            params: ListSigningProviderKeysParams
        ): Promise<ListSigningProviderKeysResult> => {
            return await getSigningProviderKeys(params)
        },
        changeSigningProvider: async (
            params: ChangeSigningProviderParams
        ): Promise<null> => {
            const { signingProviderId, partyId, publicKey } = params
            const signingProviderKeys = await getSigningProviderKeys(params)
            if (
                !signingProviderKeys.keys
                    .map((key) => key.publicKey)
                    .includes(publicKey)
            )
                throw new Error(
                    `provided publicKey does not belong to ${signingProviderId}`
                )
            const network = await store.getCurrentNetwork()
            if (network === undefined) {
                throw new Error('No network session found')
            }
            if (!network.adminAuth) {
                throw new Error('No admin auth configured')
            }
            const idp = await getIdpForAuth(network, network.adminAuth)
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
            const normalizedKey =
                partyAllocator.normalizePublicKeyToBase64(publicKey)
            if (!normalizedKey) {
                throw new Error(
                    'provided key cannot be converted to Base64 format'
                )
            }
            const namespace =
                partyAllocator.createFingerprintFromKey(normalizedKey)

            await store.updateWallet({
                partyId,
                signingProviderId,
                publicKey,
                namespace,
                reason: '',
                disabled: false,
            })
            return null
        },
        getWallet: async (
            params: GetWalletParams
        ): Promise<GetWalletResult> => {
            return await store.getWallet(params.partyId)
        },
        getTransactionStatus: async (
            params: GetTransactionStatusParams
        ): Promise<GetTransactionStatusResult> => {
            const tx = await store.getTransaction(params.transactionId)
            if (!tx)
                throw new Error(
                    `Transaction with txId: ${params.transactionId} not found in store`
                )

            //no externalTxId means nothing sent to signing provider, so no need to poll
            if (!tx.externalTxId || tx.status !== 'awaiting-signature') {
                return {
                    status: tx.status,
                    ...(tx.externalTxId && { externalTxId: tx.externalTxId }),
                    ...(tx.failureReason && {
                        failureReason: tx.failureReason,
                    }),
                }
            }

            const wallet = params.partyId
                ? (await store.getWallets()).find(
                      (x) => x.partyId === params.partyId
                  )
                : await store.getPrimaryWallet()

            if (!wallet) {
                throw new Error(
                    params.partyId
                        ? `No wallet found for partyId: ${params.partyId}`
                        : `No primary wallet found`
                )
            }

            assertIsConnected(authContext)
            const session = await store.getSession(authContext.accessToken)
            if (!session) {
                throw new Error('No active session found')
            }
            const notifier = notificationService.getNotifier(session.id)

            const transactionService = new TransactionService(
                store,
                logger,
                drivers,
                notifier,
                hashingSchemeVersion
            )

            const result = await transactionService.refreshTransaction(
                authContext,
                wallet,
                tx.id
            )
            logDynamically(logger, `refreshed transaction status`, {
                info: { transactionId: tx.id, status: result.status },
                debug: { result },
            })
            return result
        },
    })
}

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
