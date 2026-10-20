// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    isJsCantonError,
    LedgerClient,
    type UserSchema,
} from '@canton-network/core-ledger-client'
import {
    type AuthAware,
    type AuthContext,
    AuthTokenProvider,
    SelfIssuedTokenService,
    resolveAuthIdentityProviderId,
} from '@canton-network/core-wallet-auth'
import type {
    MessageRaw,
    Network,
    Session,
    Store,
    Wallet,
} from '@canton-network/core-wallet-store'
import { SigningProvider } from '@canton-network/core-signing-lib'
import {
    SignMessageService,
    type Notifier,
    type SigningDrivers,
} from '@canton-network/core-wallet-services'
import type { Logger } from 'pino'
import { v4 } from 'uuid'
import { PartyAllocationService } from './party-allocation-service.js'
import { WalletSyncService } from './wallet-sync-service.js'
import { WalletAllocationService } from './wallet-allocation/wallet-allocation-service.js'
import type { GetSelfIssuedLoginModeResult } from '../user-api/rpc-gen/typings.js'

export type SelfIssuedLoginSession = {
    userId: string
    sessionId: string
}

export type CreatePartyParams = {
    partyHint: string
    signingProviderId: SigningProvider
}

export type AccessTokenSignature =
    | { messageId: string; status: 'signed' | 'awaiting-signature' }
    | { messageId: string; status: 'failed'; failureReason: string }

export function canUserUseSelfIssuedAuth(
    user: UserSchema | null
): user is UserSchema & { primaryParty: string } {
    return (
        !!user &&
        !user.identityProviderId &&
        !!user.primaryParty &&
        !!user.primaryPartyAuthentication
    )
}

export const SELF_ISSUED_LOGIN_UNAVAILABLE =
    'Self-issued login is not available for this user.'

async function fetchLedgerUser(
    ledgerClient: LedgerClient,
    userId: string
): Promise<UserSchema | null> {
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

export async function assertLoginAllowed(
    store: Store & AuthAware<Store>,
    network: Network,
    username: string
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
        accessTokenProvider: AuthTokenProvider.fromGatewayConfig(
            adminIdp,
            network.adminAuth
        ),
    })
    const user = await fetchLedgerUser(ledgerClient, username)
    if (!user || canUserUseSelfIssuedAuth(user)) {
        return
    }
    throw new Error(SELF_ISSUED_LOGIN_UNAVAILABLE)
}

const ACCESS_TOKEN_TTL_SECONDS = 10 * 60

export class SelfIssuedAuthService {
    constructor(
        private readonly session: SelfIssuedLoginSession,
        private readonly store: Store,
        private readonly logger: Logger,
        private readonly walletAllocator: WalletAllocationService,
        private readonly ledgerClient: LedgerClient,
        private readonly drivers: SigningDrivers,
        private readonly partyAllocator: PartyAllocationService,
        private readonly signMessageService: SignMessageService
    ) {}

    async getLoginMode(): Promise<GetSelfIssuedLoginModeResult> {
        const user = await this.getExistingUser()
        if (!user) {
            return { mode: 'create' }
        }
        if (!canUserUseSelfIssuedAuth(user)) {
            throw new Error(SELF_ISSUED_LOGIN_UNAVAILABLE)
        }
        const wallet = await this.syncAuthParty(user.primaryParty)
        if (
            wallet?.partyId === user.primaryParty &&
            wallet.status === 'allocated' &&
            !wallet.disabled
        ) {
            return { mode: 'select', wallet }
        }
        return { mode: 'select', wallet: undefined }
    }

    private async syncAuthParty(partyId: string): Promise<Wallet | undefined> {
        return new WalletSyncService(
            this.store,
            this.ledgerClient,
            this.authContext(),
            this.logger,
            this.drivers,
            this.partyAllocator
        ).syncAuthParty(partyId)
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
        if (canUserUseSelfIssuedAuth(existingUser)) {
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

    async allocateParty(partyId: string): Promise<Wallet> {
        let wallet = await this.requireWallet(partyId)
        if (wallet.status !== 'allocated') {
            await this.walletAllocator.allocateParty(
                this.authContext(),
                wallet,
                wallet.signingProviderId as SigningProvider
            )
            wallet = await this.requireWallet(partyId)
        }

        return this.toWalletWithSyncedRights(wallet)
    }

    async signAccessToken(partyId: string): Promise<AccessTokenSignature> {
        const wallet = await this.requireLoginWallet(partyId)
        await this.assertCanAuthenticateWith(wallet)

        const signingInput = await this.prepareTokenForSigning(wallet)
        const message = await this.createSelfIssuedTokenMessage(
            wallet,
            signingInput
        )
        const result = await this.signMessageService.sign(
            this.authContext(),
            message.id
        )
        return this.toAccessTokenSignResult(message.id, result)
    }

    async refreshAccessTokenSignature(
        messageId: string
    ): Promise<AccessTokenSignature> {
        await this.requireTokenMessage(messageId)
        const result = await this.signMessageService.refreshMessage(
            this.authContext(),
            messageId
        )
        return this.toAccessTokenSignResult(messageId, result)
    }

    async completeLogin(
        messageId: string
    ): Promise<{ wallet: Wallet; accessToken: string; session: Session }> {
        const { message, wallet } = await this.requireTokenMessage(messageId)
        if (message.status !== 'signed' || !message.signature) {
            throw new Error(
                `Self-issued login request ${messageId} is not signed`
            )
        }

        const username = this.session.userId
        const existingUser = await this.getExistingUser()
        const authPartyWallet = canUserUseSelfIssuedAuth(existingUser)
            ? this.requireExistingAuthParty(wallet, existingUser.primaryParty)
            : await this.setUserAuthParty(username, wallet)

        const accessToken = SelfIssuedTokenService.appendJwtSignature(
            message.message,
            message.signature
        )
        await this.probeAccessToken(accessToken)
        const session = await this.store.upgradeSelfIssuedLoginSession(
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

    private toAccessTokenSignResult(
        messageId: string,
        result: { status: string; failureReason?: string }
    ): AccessTokenSignature {
        if (
            result.status === 'signed' ||
            result.status === 'awaiting-signature'
        ) {
            return { messageId, status: result.status }
        }
        if (result.status === 'failed') {
            return {
                messageId,
                status: 'failed',
                failureReason:
                    result.failureReason ??
                    'Signing the self-issued token failed',
            }
        }
        throw new Error(
            `Self-issued login request ${messageId} was not submitted for signing`
        )
    }

    private async assertCanAuthenticateWith(wallet: Wallet): Promise<void> {
        const existingUser = await this.getExistingUser()
        if (canUserUseSelfIssuedAuth(existingUser)) {
            this.requireExistingAuthParty(wallet, existingUser.primaryParty)
        }
    }

    private async requireTokenMessage(
        messageId: string
    ): Promise<{ message: MessageRaw; wallet: Wallet }> {
        const message = await this.store.getMessageRaw(messageId)
        if (!message || message.kind !== 'self-issued-token') {
            throw new Error(
                `Self-issued login request not found with id: ${messageId}`
            )
        }

        const wallet = await this.requireLoginWallet(message.partyId)
        if (wallet.publicKey !== message.publicKey) {
            throw new Error(
                `Wallet public key changed for party ${wallet.partyId}; refusing to complete login`
            )
        }
        return { message, wallet }
    }

    private async requireLoginWallet(partyId: string): Promise<Wallet> {
        const wallet = await this.requireWallet(partyId)
        if (wallet.status !== 'allocated') {
            throw new Error(`Wallet for party ${partyId} is not allocated`)
        }
        return wallet
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

    private async prepareTokenForSigning(wallet: Wallet): Promise<string> {
        const network = await this.store.getCurrentNetwork()
        if (network.auth.method !== 'self_issued') {
            throw new Error('Network does not use self_issued authentication')
        }
        if (!network.synchronizerId) {
            throw new Error('Current network has no synchronizerId')
        }

        return SelfIssuedTokenService.prepareForSigning(wallet.publicKey, {
            audience: network.auth.audience,
            scope: network.auth.scope,
            partyId: wallet.partyId,
            username: this.session.userId,
            synchronizerId: network.synchronizerId,
            ttlSeconds: ACCESS_TOKEN_TTL_SECONDS,
        })
    }

    private async probeAccessToken(accessToken: string): Promise<void> {
        const network = await this.store.getCurrentNetwork()
        const probe = new LedgerClient({
            baseUrl: new URL(network.ledgerApi.baseUrl),
            accessTokenProvider: AuthTokenProvider.fromToken(accessToken),
        })
        try {
            await probe.get('/v2/authenticated-user')
        } catch (error) {
            throw new Error(
                'Self-issued token was rejected by the participant',
                { cause: error }
            )
        }
    }

    private async createSelfIssuedTokenMessage(
        wallet: Wallet,
        signingInput: string
    ): Promise<MessageRaw> {
        const message: MessageRaw = {
            id: v4(),
            kind: 'self-issued-token',
            status: 'pending',
            userId: this.session.userId,
            partyId: wallet.partyId,
            publicKey: wallet.publicKey,
            message: signingInput,
            origin: null,
            createdAt: new Date(),
        }
        await this.store.setMessageRaw(message)
        return message
    }

    private authContext(): AuthContext {
        return toSelfIssuedLoginAuthContext(this.session)
    }
}

function toSelfIssuedLoginAuthContext(
    session: SelfIssuedLoginSession
): AuthContext {
    return {
        userId: session.userId,
        accessToken: '',
        sessionId: session.sessionId,
    }
}

export async function createSelfIssuedAuthService(
    bootstrapStore: Store & AuthAware<Store>,
    session: SelfIssuedLoginSession,
    drivers: SigningDrivers,
    logger: Logger,
    notifier: Notifier
): Promise<SelfIssuedAuthService> {
    const scopedStore = bootstrapStore.withAuthContext(
        toSelfIssuedLoginAuthContext(session)
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
        network.adminAuth
    )
    const partyAllocator = new PartyAllocationService({
        synchronizerId: network.synchronizerId,
        accessTokenProvider: adminTokenProvider,
        httpLedgerUrl: network.ledgerApi.baseUrl,
    })
    const walletAllocationService = new WalletAllocationService(
        scopedStore,
        logger,
        partyAllocator,
        drivers
    )
    const ledgerClient = new LedgerClient({
        baseUrl: new URL(network.ledgerApi.baseUrl),
        accessTokenProvider: adminTokenProvider,
    })

    return new SelfIssuedAuthService(
        session,
        scopedStore,
        logger,
        walletAllocationService,
        ledgerClient,
        drivers,
        partyAllocator,
        new SignMessageService(scopedStore, drivers, notifier)
    )
}
