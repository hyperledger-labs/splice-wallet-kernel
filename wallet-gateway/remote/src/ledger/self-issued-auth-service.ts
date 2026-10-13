// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    isJsCantonError,
    LedgerClient,
} from '@canton-network/core-ledger-client'
import {
    type AuthAware,
    type AuthContext,
    AuthTokenProvider,
    SelfIssuedTokenService,
    resolveAuthIdentityProviderId,
} from '@canton-network/core-wallet-auth'
import type {
    Network,
    Session,
    Store,
    Wallet,
} from '@canton-network/core-wallet-store'
import { isRpcError, SigningProvider } from '@canton-network/core-signing-lib'
import type { SigningDrivers } from '@canton-network/core-wallet-services'
import type { Logger } from 'pino'
import { PartyAllocationService } from './party-allocation-service.js'
import { WalletSyncService } from './wallet-sync-service.js'
import { WalletAllocationService } from './wallet-allocation/wallet-allocation-service.js'

export type SelfIssuedOnboardingSession = {
    userId: string
    sessionId: string
}

export type CreatePartyParams = {
    partyHint: string
    signingProviderId: SigningProvider
}

export type PartyParams = {
    partyId: string
}

export type SelfIssuedOnboardingState = {
    userExists: boolean
    primaryPartyAuth: boolean
    wallets: Wallet[]
}

type LedgerUser = {
    primaryParty?: string
    primaryPartyAuthentication?: boolean
}

function isOnboarded(user: LedgerUser | null): boolean {
    return !!user && !!user.primaryParty && !!user.primaryPartyAuthentication
}

const SELF_ISSUED_LOGIN_UNAVAILABLE =
    'Self-issued login is not available for this user.'

async function fetchLedgerUser(
    ledgerClient: LedgerClient,
    userId: string
): Promise<LedgerUser | null> {
    try {
        const response = await ledgerClient.get('/v2/users/{user-id}', {
            path: { 'user-id': userId },
        })
        return response.user ?? null
    } catch (error) {
        if (isJsCantonError(error) && error.code === 'USER_NOT_FOUND') {
            return null
        }
        throw error
    }
}

export async function assertSelfIssuedOnboardingAllowed(
    store: Store & AuthAware<Store>,
    network: Network,
    username: string,
    logger: Logger
): Promise<void> {
    if (!network.adminAuth) {
        throw new Error('No admin auth configured')
    }
    const adminIdp = await store.getIdp(
        resolveAuthIdentityProviderId(
            network.adminAuth,
            network.identityProviderId
        )
    )
    const ledgerClient = new LedgerClient({
        baseUrl: new URL(network.ledgerApi.baseUrl),
        logger,
        accessTokenProvider: AuthTokenProvider.fromGatewayConfig(
            adminIdp,
            network.adminAuth,
            logger
        ),
    })
    const user = await fetchLedgerUser(ledgerClient, username)
    if (!user) {
        return
    }
    const primaryParty = user.primaryParty
    const hasAuthWallet =
        !!primaryParty &&
        !!user.primaryPartyAuthentication &&
        (
            await store
                .withAuthContext({ userId: username, accessToken: '' })
                .getAllWallets({ networkIds: [network.id] })
        ).some(
            (wallet) =>
                wallet.isAuthParty &&
                wallet.userId === username &&
                wallet.partyId === primaryParty
        )
    if (!hasAuthWallet) {
        throw new Error(SELF_ISSUED_LOGIN_UNAVAILABLE)
    }
}

const ACCESS_TOKEN_TTL_SECONDS = 10 * 60

export class SelfIssuedAuthService {
    constructor(
        private readonly session: SelfIssuedOnboardingSession,
        private readonly store: Store,
        private readonly logger: Logger,
        private readonly walletAllocator: WalletAllocationService,
        private readonly ledgerClient: LedgerClient,
        private readonly drivers: SigningDrivers
    ) {}

    async getOnboardingState(): Promise<SelfIssuedOnboardingState> {
        const user = await this.getExistingUser()
        return {
            userExists: user !== null,
            primaryPartyAuth: isOnboarded(user),
            wallets: (await this.store.getWallets()).filter(
                (wallet) => wallet.isAuthParty
            ),
        }
    }

    private async getExistingUser() {
        return fetchLedgerUser(this.ledgerClient, this.session.userId)
    }

    async createWallet(params: CreatePartyParams): Promise<Wallet> {
        const username = this.session.userId
        const partyHint = params.partyHint.trim()
        if (!partyHint) {
            throw new Error('partyHint is required')
        }
        if (params.signingProviderId === SigningProvider.PARTICIPANT) {
            throw new Error(
                'Signing provider participant is not supported for self-issued onboarding'
            )
        }

        const existingUser = await this.getExistingUser()
        if (isOnboarded(existingUser)) {
            throw new Error(
                'Primary party authentication is already configured for this user.'
            )
        }

        // If user already exists but has no primaryPartyAuth and primaryParty set, it means either:
        // - onboarding flow was interrupted before a wallet was allocated, but after user was created
        // - the user was created outside of onboarding flow
        if (!existingUser) {
            await this.ledgerClient.post('/v2/users', {
                user: {
                    id: username,
                    isDeactivated: false,
                    identityProviderId: '',
                },
                rights: [],
            })
        }

        const wallet = await this.walletAllocator.createWallet(
            this.authContext(),
            partyHint,
            false,
            params.signingProviderId
        )

        this.logger.info(
            {
                username,
                partyHint,
                partyId: wallet.partyId,
                status: wallet.status,
                signingProviderId: params.signingProviderId,
            },
            'Created self-issued authentication party'
        )

        return this.toWalletWithSyncedRights(wallet)
    }

    async allocateParty(params: PartyParams): Promise<Wallet> {
        let wallet = await this.requireWallet(params.partyId)
        if (wallet.status !== 'allocated') {
            await this.walletAllocator.allocateParty(
                this.authContext(),
                wallet,
                wallet.signingProviderId as SigningProvider
            )
            wallet = await this.requireWallet(params.partyId)
        }

        return this.toWalletWithSyncedRights(wallet)
    }

    async connectSession(
        params: PartyParams
    ): Promise<{ wallet: Wallet; accessToken: string; session: Session }> {
        const username = this.session.userId
        const wallet = await this.requireWallet(params.partyId)
        if (wallet.status !== 'allocated') {
            throw new Error(
                `Wallet for party ${params.partyId} is not allocated`
            )
        }

        const existingUser = await this.getExistingUser()
        const authPartyWallet = isOnboarded(existingUser)
            ? this.requireExistingAuthParty(wallet, existingUser?.primaryParty)
            : await this.setUserAuthParty(username, wallet)
        const accessToken = await this.mintAccessToken(authPartyWallet)
        const session = await this.store.upgradeOnboardingSession(
            this.session.sessionId,
            accessToken
        )

        this.logger.info(
            {
                username,
                partyId: authPartyWallet.partyId,
                status: authPartyWallet.status,
                signingProviderId: authPartyWallet.signingProviderId,
                isAuthParty: authPartyWallet.isAuthParty,
            },
            'Established self-issued session'
        )

        return { wallet: authPartyWallet, accessToken, session }
    }

    private requireExistingAuthParty(
        wallet: Wallet,
        userPrimaryParty: string | undefined
    ): Wallet {
        if (!wallet.isAuthParty || userPrimaryParty !== wallet.partyId) {
            throw new Error(
                `Party ${wallet.partyId} is not the authentication party for this user`
            )
        }
        return wallet
    }

    private async setUserAuthParty(
        username: string,
        wallet: Wallet
    ): Promise<Wallet> {
        await this.ledgerClient.patch(
            '/v2/users/{user-id}',
            {
                user: {
                    id: username,
                    primaryParty: wallet.partyId,
                    primaryPartyAuthentication: true,
                },
                updateMask: {
                    paths: ['primary_party', 'primary_party_authentication'],
                    unknownFields: { fields: {} },
                },
            },
            { path: { 'user-id': username } }
        )
        await this.store.updateWallet({
            partyId: wallet.partyId,
            networkId: wallet.networkId,
            isAuthParty: true,
        })
        return this.requireWallet(wallet.partyId)
    }

    private async toWalletWithSyncedRights(wallet: Wallet): Promise<Wallet> {
        if (wallet.status !== 'allocated') {
            return wallet
        }

        await new WalletSyncService(
            this.store,
            this.ledgerClient,
            this.authContext(),
            this.logger
        ).syncRights()

        return this.requireWallet(wallet.partyId)
    }

    private async requireWallet(partyId: string): Promise<Wallet> {
        const wallet = await this.store.getWallet(partyId)
        if (!wallet) {
            throw new Error(`Wallet not found for party ${partyId}`)
        }
        return wallet
    }

    private async mintAccessToken(wallet: Wallet): Promise<string> {
        const username = this.session.userId
        const network = await this.store.getCurrentNetwork()
        if (network.auth.method !== 'self_issued') {
            throw new Error('Network does not use self_issued authentication')
        }
        if (!network.synchronizerId) {
            throw new Error('Current network has no synchronizerId')
        }

        const signingProviderId = wallet.signingProviderId as SigningProvider
        const driver = this.drivers[signingProviderId]?.controller(username)
        if (!driver) {
            throw new Error(
                `Signing driver ${signingProviderId} is not available`
            )
        }

        const signingInput = await SelfIssuedTokenService.prepareForSigning(
            wallet.publicKey,
            {
                audience: network.auth.audience,
                scope: network.auth.scope,
                partyId: wallet.partyId,
                username,
                synchronizerId: network.synchronizerId,
                ttlSeconds: ACCESS_TOKEN_TTL_SECONDS,
            }
        )

        // TODO(#2495) with other signing providers this will be async
        const result = await driver.signMessage({
            message: signingInput,
            keyIdentifier: { publicKey: wallet.publicKey },
        })
        if (isRpcError(result) || !result.signature) {
            throw new Error(
                isRpcError(result)
                    ? result.error_description
                    : 'signMessage failed'
            )
        }

        const token = SelfIssuedTokenService.appendJwtSignature(
            signingInput,
            result.signature
        )
        const probe = new LedgerClient({
            baseUrl: new URL(network.ledgerApi.baseUrl),
            logger: this.logger,
            accessTokenProvider: AuthTokenProvider.fromToken(
                token,
                this.logger
            ),
        })
        try {
            await probe.get('/v2/authenticated-user')
        } catch (error) {
            throw new Error(
                'Self-issued token was rejected by the participant',
                { cause: error }
            )
        }

        return token
    }

    private authContext(): AuthContext {
        return toOnboardingAuthContext(this.session)
    }
}

function toOnboardingAuthContext(
    session: SelfIssuedOnboardingSession
): AuthContext {
    return {
        userId: session.userId,
        accessToken: '',
        sessionId: session.sessionId,
    }
}

export async function createSelfIssuedAuthService(
    bootstrapStore: Store & AuthAware<Store>,
    session: SelfIssuedOnboardingSession,
    drivers: SigningDrivers,
    logger: Logger
): Promise<SelfIssuedAuthService> {
    const scopedStore = bootstrapStore.withAuthContext(
        toOnboardingAuthContext(session)
    )
    const network = await scopedStore.getCurrentNetwork()
    if (network.auth.method !== 'self_issued') {
        throw new Error('Network does not use self_issued authentication')
    }
    const idp = await bootstrapStore.getIdp(network.identityProviderId)
    if (idp.type !== 'self_issued') {
        throw new Error(
            'Identity provider is not configured for self_issued authentication'
        )
    }
    if (!network.adminAuth) {
        throw new Error('No admin auth configured')
    }

    const adminIdp = await bootstrapStore.getIdp(
        resolveAuthIdentityProviderId(
            network.adminAuth,
            network.identityProviderId
        )
    )
    const adminTokenProvider = AuthTokenProvider.fromGatewayConfig(
        adminIdp,
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
        scopedStore,
        logger,
        partyAllocator,
        drivers
    )
    const ledgerClient = new LedgerClient({
        baseUrl: new URL(network.ledgerApi.baseUrl),
        logger,
        accessTokenProvider: adminTokenProvider,
    })

    return new SelfIssuedAuthService(
        session,
        scopedStore,
        logger,
        walletAllocationService,
        ledgerClient,
        drivers
    )
}
