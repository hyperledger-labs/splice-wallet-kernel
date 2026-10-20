// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    vi,
    describe,
    it,
    expect,
    beforeAll,
    beforeEach,
    afterEach,
} from 'vitest'
import { getLogger } from '@logtape/logtape'
import { pino, type Logger } from 'pino'
import { sink } from 'pino-test'
import {
    createLocalJWKSet,
    exportJWK,
    generateKeyPair,
    SignJWT,
    type JWK,
} from 'jose'
import {
    IdpUnavailableError,
    type AuthContext,
    type AuthService,
} from '@canton-network/core-wallet-auth'
import {
    PartyLevelRight,
    type Network,
    type Wallet,
} from '@canton-network/core-wallet-store'
import { StoreInternal } from '@canton-network/core-wallet-store-inmemory'
import { jwtAuthService } from './jwt-auth-service.js'

const mockFetch = vi.hoisted(() => vi.fn())
const mockCreateRemoteJWKSet = vi.hoisted(() => vi.fn())
const jose = vi.hoisted(() => ({
    createRemoteJWKSet:
        undefined as unknown as typeof import('jose').createRemoteJWKSet,
}))

vi.mock('jose', async (importOriginal) => {
    const actual = await importOriginal<typeof import('jose')>()
    jose.createRemoteJWKSet = actual.createRemoteJWKSet
    return {
        ...actual,
        createRemoteJWKSet: mockCreateRemoteJWKSet,
    }
})

const authContext: AuthContext = {
    userId: 'test-user-id',
    accessToken: 'test-access-token',
}

const SELF_SIGNED_ISSUER = 'unsafe-auth'
const SELF_SIGNED_AUDIENCE = 'self-signed-audience'
const SELF_SIGNED_SECRET = 'test-secret'
const SELF_SIGNED_NETWORK_ID = 'network-self'
const OAUTH_ISSUER = 'https://oauth.example.com'
const OAUTH_JWKS_URI = 'https://oauth.example.com/jwks'
const OAUTH_KEY_ID = 'oauth-test-key'

async function hs256BearerToken(
    claims: Record<string, unknown>,
    secret = SELF_SIGNED_SECRET,
    keyId: string | null = SELF_SIGNED_NETWORK_ID
): Promise<string> {
    const jwt = await new SignJWT(claims)
        .setProtectedHeader({
            alg: 'HS256',
            ...(keyId ? { kid: keyId } : {}),
        })
        .sign(new TextEncoder().encode(secret))
    return `Bearer ${jwt}`
}

function unsignedBearerToken(
    claims: Record<string, unknown>,
    keyId = SELF_SIGNED_NETWORK_ID
): string {
    const encode = (value: Record<string, unknown>): string =>
        Buffer.from(JSON.stringify(value)).toString('base64url')

    const header = encode({ alg: 'none', typ: 'JWT', kid: keyId })
    const payload = encode(claims)
    return `Bearer ${header}.${payload}.`
}

async function rs256BearerToken(
    claims: Record<string, unknown>,
    privateKey: CryptoKey
): Promise<string> {
    const jwt = await new SignJWT(claims)
        .setProtectedHeader({ alg: 'RS256', kid: OAUTH_KEY_ID })
        .sign(privateKey)
    return `Bearer ${jwt}`
}

async function eddsaBearerToken(
    claims: Record<string, unknown>,
    privateKey: CryptoKey
): Promise<string> {
    const jwt = await new SignJWT(claims)
        .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT' })
        .sign(privateKey)
    return `Bearer ${jwt}`
}

async function rawEd25519PublicKeyBase64(
    publicKey: CryptoKey
): Promise<string> {
    const jwk = await exportJWK(publicKey)
    if (!jwk.x) {
        throw new Error('Ed25519 JWK is missing x')
    }
    return Buffer.from(jwk.x, 'base64url').toString('base64')
}

const SELF_ISSUED_USER_ID = 'test-user-id'
const SELF_ISSUED_PARTY_ID = 'alice::namespace'
const SELF_ISSUED_NETWORK_ID = 'network-self-issued'
const SELF_ISSUED_AUDIENCE = 'self-issued-audience'

const createSelfIssuedNetwork = (
    id = SELF_ISSUED_NETWORK_ID,
    audience = SELF_ISSUED_AUDIENCE
): Network => ({
    id,
    name: `Network ${id}`,
    synchronizerId: `${id}-sync`,
    identityProviderId: 'idp-self-issued',
    description: `Test Network ${id}`,
    ledgerApi: { baseUrl: `http://${id}` },
    auth: {
        method: 'self_issued',
        audience,
        scope: 'daml_ledger_api',
    },
})

const selfIssuedWallet = (
    publicKey: string,
    extras: Partial<Wallet> = {}
): Wallet => ({
    primary: true,
    status: 'allocated',
    partyId: SELF_ISSUED_PARTY_ID,
    hint: 'alice',
    publicKey,
    namespace: 'namespace',
    networkId: SELF_ISSUED_NETWORK_ID,
    signingProviderId: 'WALLET_KERNEL',
    rights: [PartyLevelRight.CanActAs],
    userId: SELF_ISSUED_USER_ID,
    isAuthParty: true,
    ...extras,
})

const selfIssuedClaims = (
    extras: Record<string, unknown> = {}
): Record<string, unknown> => ({
    iss: SELF_ISSUED_PARTY_ID,
    sub: SELF_ISSUED_PARTY_ID,
    aud: SELF_ISSUED_AUDIENCE,
    exp: Math.floor(Date.now() / 1000) + 3600,
    'daml.com': { usr: SELF_ISSUED_USER_ID, syn: 'sync' },
    ...extras,
})

const createOAuthNetwork = (
    id: string,
    identityProviderId: string,
    audience = 'test-audience'
): Network => ({
    id,
    name: `Network ${id}`,
    synchronizerId: `${id}-sync`,
    identityProviderId,
    description: `Test Network ${id}`,
    ledgerApi: { baseUrl: `http://${id}` },
    auth: {
        method: 'authorization_code' as const,
        clientId: 'cid',
        scope: 'openid',
        audience,
    },
})

const createSelfSignedNetwork = (
    id: string,
    audience: string,
    clientSecret: string,
    identityProviderId = 'idp-self'
): Network => ({
    id,
    name: `Network ${id}`,
    synchronizerId: `${id}-sync`,
    identityProviderId,
    description: `Test Network ${id}`,
    ledgerApi: { baseUrl: `http://${id}` },
    auth: {
        method: 'self_signed',
        issuer: SELF_SIGNED_ISSUER,
        audience,
        scope: 'openid',
        clientId: 'cid',
        clientSecret,
    },
})

describe('jwtAuthService', () => {
    let mockLogger: Logger
    let store: StoreInternal

    beforeEach(async () => {
        mockLogger = pino(sink())
        store = new StoreInternal(
            { idps: [], networks: [] },
            getLogger('mock'),
            authContext
        )
        vi.stubGlobal('fetch', mockFetch)
        mockFetch.mockReset()
        mockCreateRemoteJWKSet.mockReset()
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('returns undefined when access token is missing', async () => {
        const service = jwtAuthService(store, mockLogger)
        await expect(service.verifyToken(undefined)).resolves.toBeUndefined()
    })

    it('returns undefined when authorization header is not Bearer', async () => {
        const service = jwtAuthService(store, mockLogger)
        await expect(service.verifyToken('Basic abc')).resolves.toBeUndefined()
    })

    it('returns undefined when JWT has no issuer', async () => {
        const service = jwtAuthService(store, mockLogger)
        const token = await hs256BearerToken({ sub: 'user-1', scope: 'openid' })
        await expect(service.verifyToken(token)).resolves.toBeUndefined()
    })

    it('returns undefined when no identity provider matches issuer', async () => {
        await store.addIdp({
            id: 'idp-self',
            type: 'self_signed',
            issuer: SELF_SIGNED_ISSUER,
        })

        const service = jwtAuthService(store, mockLogger)
        const token = await hs256BearerToken({
            iss: 'unknown-issuer',
            sub: 'user-1',
            scope: 'openid',
        })
        await expect(service.verifyToken(token)).resolves.toBeUndefined()
    })

    it('returns undefined when JWT has no scope or scp claim', async () => {
        await store.addIdp({
            id: 'idp-self',
            type: 'self_signed',
            issuer: SELF_SIGNED_ISSUER,
        })

        const service = jwtAuthService(store, mockLogger)
        const token = await hs256BearerToken({
            iss: SELF_SIGNED_ISSUER,
            sub: 'user-1',
        })
        await expect(service.verifyToken(token)).resolves.toBeUndefined()
    })

    describe('self_signed identity provider', () => {
        beforeEach(async () => {
            await store.addIdp({
                id: 'idp-self',
                type: 'self_signed',
                issuer: SELF_SIGNED_ISSUER,
            })
        })

        it('returns auth context for a valid self-signed token', async () => {
            await store.addNetwork(
                createSelfSignedNetwork(
                    'network-self',
                    SELF_SIGNED_AUDIENCE,
                    SELF_SIGNED_SECRET
                )
            )

            const service = jwtAuthService(store, mockLogger)
            const token = await hs256BearerToken({
                iss: SELF_SIGNED_ISSUER,
                sub: 'user-1',
                aud: SELF_SIGNED_AUDIENCE,
                scope: 'openid',
            })

            const result = await service.verifyToken(token)
            expect(result).toEqual({
                userId: 'user-1',
                accessToken: token.split(' ')[1],
            })
        })

        it('accepts scp claim instead of scope', async () => {
            await store.addNetwork(
                createSelfSignedNetwork(
                    'network-self',
                    SELF_SIGNED_AUDIENCE,
                    SELF_SIGNED_SECRET
                )
            )

            const service = jwtAuthService(store, mockLogger)
            const token = await hs256BearerToken({
                iss: SELF_SIGNED_ISSUER,
                sub: 'user-1',
                aud: SELF_SIGNED_AUDIENCE,
                scp: 'openid',
            })

            const result = await service.verifyToken(token)
            expect(result?.userId).toBe('user-1')
        })

        it('includes email when present in token', async () => {
            await store.addNetwork(
                createSelfSignedNetwork(
                    'network-self',
                    SELF_SIGNED_AUDIENCE,
                    SELF_SIGNED_SECRET
                )
            )

            const service = jwtAuthService(store, mockLogger)
            const token = await hs256BearerToken({
                iss: SELF_SIGNED_ISSUER,
                sub: 'user-1',
                aud: SELF_SIGNED_AUDIENCE,
                scope: 'openid',
                email: 'user@example.com',
            })

            const result = await service.verifyToken(token)
            expect(result).toEqual({
                userId: 'user-1',
                accessToken: token.split(' ')[1],
                email: 'user@example.com',
            })
        })

        it('accepts a token whose audience is an array containing a matching network', async () => {
            await store.addNetwork(
                createSelfSignedNetwork(
                    'network-self',
                    SELF_SIGNED_AUDIENCE,
                    SELF_SIGNED_SECRET
                )
            )

            const service = jwtAuthService(store, mockLogger)
            const token = await hs256BearerToken({
                iss: SELF_SIGNED_ISSUER,
                sub: 'user-1',
                aud: ['other-audience', SELF_SIGNED_AUDIENCE],
                scope: 'openid',
            })

            const result = await service.verifyToken(token)
            expect(result?.userId).toBe('user-1')
        })

        it('returns undefined when JWT has no subject', async () => {
            await store.addNetwork(
                createSelfSignedNetwork(
                    'network-self',
                    SELF_SIGNED_AUDIENCE,
                    SELF_SIGNED_SECRET
                )
            )

            const service = jwtAuthService(store, mockLogger)
            const token = await hs256BearerToken({
                iss: SELF_SIGNED_ISSUER,
                aud: SELF_SIGNED_AUDIENCE,
                scope: 'openid',
            })
            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })

        it('returns undefined when JWT has no key id', async () => {
            await store.addNetwork(
                createSelfSignedNetwork(
                    'network-self',
                    SELF_SIGNED_AUDIENCE,
                    SELF_SIGNED_SECRET
                )
            )

            const service = jwtAuthService(store, mockLogger)
            const token = await hs256BearerToken(
                {
                    iss: SELF_SIGNED_ISSUER,
                    sub: 'user-1',
                    aud: SELF_SIGNED_AUDIENCE,
                    scope: 'openid',
                },
                SELF_SIGNED_SECRET,
                null
            )
            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })

        it('returns undefined when no network has the JWT network id', async () => {
            await store.addNetwork(
                createSelfSignedNetwork(
                    'network-self',
                    SELF_SIGNED_AUDIENCE,
                    SELF_SIGNED_SECRET
                )
            )

            const service = jwtAuthService(store, mockLogger)
            const token = await hs256BearerToken(
                {
                    iss: SELF_SIGNED_ISSUER,
                    sub: 'user-1',
                    aud: SELF_SIGNED_AUDIENCE,
                    scope: 'openid',
                },
                SELF_SIGNED_SECRET,
                'unknown-network'
            )
            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })

        it('returns undefined when JWT has no audience', async () => {
            await store.addNetwork(
                createSelfSignedNetwork(
                    'network-self',
                    SELF_SIGNED_AUDIENCE,
                    SELF_SIGNED_SECRET
                )
            )

            const service = jwtAuthService(store, mockLogger)
            const token = await hs256BearerToken({
                iss: SELF_SIGNED_ISSUER,
                sub: 'user-1',
                scope: 'openid',
            })
            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })

        it('returns undefined when audience does not match any network', async () => {
            await store.addNetwork(
                createSelfSignedNetwork(
                    'network-self',
                    SELF_SIGNED_AUDIENCE,
                    SELF_SIGNED_SECRET
                )
            )

            const service = jwtAuthService(store, mockLogger)
            const token = await hs256BearerToken({
                iss: SELF_SIGNED_ISSUER,
                sub: 'user-1',
                aud: 'unknown-audience',
                scope: 'openid',
            })
            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })

        it('returns undefined when the signature does not match any candidate secret', async () => {
            await store.addNetwork(
                createSelfSignedNetwork(
                    'network-self',
                    SELF_SIGNED_AUDIENCE,
                    SELF_SIGNED_SECRET
                )
            )

            const service = jwtAuthService(store, mockLogger)
            const token = await hs256BearerToken(
                {
                    iss: SELF_SIGNED_ISSUER,
                    sub: 'user-1',
                    aud: SELF_SIGNED_AUDIENCE,
                    scope: 'openid',
                },
                'wrong-secret'
            )
            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })

        it('returns undefined when the token is expired', async () => {
            await store.addNetwork(
                createSelfSignedNetwork(
                    'network-self',
                    SELF_SIGNED_AUDIENCE,
                    SELF_SIGNED_SECRET
                )
            )

            const service = jwtAuthService(store, mockLogger)
            const token = await hs256BearerToken({
                iss: SELF_SIGNED_ISSUER,
                sub: 'user-1',
                aud: SELF_SIGNED_AUDIENCE,
                scope: 'openid',
                exp: Math.floor(Date.now() / 1000) - 60,
            })
            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })

        it('returns undefined when the kid network belongs to another identity provider', async () => {
            await store.addIdp({
                id: 'idp-other',
                type: 'self_signed',
                issuer: 'other-issuer',
            })
            await store.addNetwork(
                createSelfSignedNetwork(
                    'network-other',
                    SELF_SIGNED_AUDIENCE,
                    SELF_SIGNED_SECRET,
                    'idp-other'
                )
            )

            const service = jwtAuthService(store, mockLogger)
            // Issuer resolves to idp-self, but the kid names a network owned
            // by idp-other.
            const token = await hs256BearerToken(
                {
                    iss: SELF_SIGNED_ISSUER,
                    sub: 'user-1',
                    aud: SELF_SIGNED_AUDIENCE,
                    scope: 'openid',
                },
                SELF_SIGNED_SECRET,
                'network-other'
            )

            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })

        it('returns undefined for an unsigned token using the none algorithm', async () => {
            await store.addNetwork(
                createSelfSignedNetwork(
                    'network-self',
                    SELF_SIGNED_AUDIENCE,
                    SELF_SIGNED_SECRET
                )
            )

            const service = jwtAuthService(store, mockLogger)
            const token = unsignedBearerToken({
                iss: SELF_SIGNED_ISSUER,
                sub: 'user-1',
                aud: SELF_SIGNED_AUDIENCE,
                scope: 'openid',
            })

            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })

        it('returns undefined for an asymmetrically signed token', async () => {
            await store.addNetwork(
                createSelfSignedNetwork(
                    'network-self',
                    SELF_SIGNED_AUDIENCE,
                    SELF_SIGNED_SECRET
                )
            )

            const { privateKey } = await generateKeyPair('RS256')
            const service = jwtAuthService(store, mockLogger)
            const jwt = await new SignJWT({
                iss: SELF_SIGNED_ISSUER,
                sub: 'user-1',
                aud: SELF_SIGNED_AUDIENCE,
                scope: 'openid',
                exp: Math.floor(Date.now() / 1000) + 3600,
            })
                .setProtectedHeader({
                    alg: 'RS256',
                    kid: SELF_SIGNED_NETWORK_ID,
                })
                .sign(privateKey)

            await expect(
                service.verifyToken(`Bearer ${jwt}`)
            ).resolves.toBeUndefined()
        })

        describe('multiple networks', () => {
            const AUD_A = 'audience-a'
            const AUD_B = 'audience-b'
            const SECRET_A = 'secret-a'
            const SECRET_B = 'secret-b'
            const NETWORK_A = 'network-a'
            const NETWORK_B = 'network-b'

            const claims = (aud: string): Record<string, unknown> => ({
                iss: SELF_SIGNED_ISSUER,
                sub: 'user-1',
                aud,
                scope: 'openid',
            })

            it('accepts tokens only when kid, secret, and audience belong to the same network', async () => {
                await store.addNetwork(
                    createSelfSignedNetwork(NETWORK_A, AUD_A, SECRET_A)
                )
                await store.addNetwork(
                    createSelfSignedNetwork(NETWORK_B, AUD_B, SECRET_B)
                )

                const service = jwtAuthService(store, mockLogger)

                await expect(
                    service.verifyToken(
                        await hs256BearerToken(
                            claims(AUD_A),
                            SECRET_A,
                            NETWORK_A
                        )
                    )
                ).resolves.toMatchObject({ userId: 'user-1' })
                await expect(
                    service.verifyToken(
                        await hs256BearerToken(
                            claims(AUD_B),
                            SECRET_B,
                            NETWORK_B
                        )
                    )
                ).resolves.toMatchObject({ userId: 'user-1' })
            })

            it('does not fall back to another network secret when the kid-selected secret rejects the token', async () => {
                await store.addNetwork(
                    createSelfSignedNetwork(NETWORK_A, AUD_A, SECRET_A)
                )
                await store.addNetwork(
                    createSelfSignedNetwork(NETWORK_B, AUD_A, SECRET_B)
                )

                const service = jwtAuthService(store, mockLogger)
                const tokenSignedWithNetworkBSecret = await hs256BearerToken(
                    claims(AUD_A),
                    SECRET_B,
                    NETWORK_A
                )

                await expect(
                    service.verifyToken(tokenSignedWithNetworkBSecret)
                ).resolves.toBeUndefined()
            })

            it('does not accept another network audience when networks share a secret', async () => {
                await store.addNetwork(
                    createSelfSignedNetwork(NETWORK_A, AUD_A, SECRET_A)
                )
                await store.addNetwork(
                    createSelfSignedNetwork(NETWORK_B, AUD_B, SECRET_A)
                )

                const service = jwtAuthService(store, mockLogger)
                const tokenForNetworkBAudience = await hs256BearerToken(
                    claims(AUD_B),
                    SECRET_A,
                    NETWORK_A
                )

                await expect(
                    service.verifyToken(tokenForNetworkBAudience)
                ).resolves.toBeUndefined()
            })

            it('rejects changing a valid token kid to another network id', async () => {
                await store.addNetwork(
                    createSelfSignedNetwork(NETWORK_A, AUD_A, SECRET_A)
                )
                await store.addNetwork(
                    createSelfSignedNetwork(NETWORK_B, AUD_B, SECRET_B)
                )

                const service = jwtAuthService(store, mockLogger)
                const networkATokenWithNetworkBKid = await hs256BearerToken(
                    claims(AUD_A),
                    SECRET_A,
                    NETWORK_B
                )

                await expect(
                    service.verifyToken(networkATokenWithNetworkBKid)
                ).resolves.toBeUndefined()
            })
        })
    })

    describe('oauth identity provider', () => {
        const configUrl =
            'https://oauth.example.com/.well-known/openid-configuration'

        let oauthPrivateKey: CryptoKey
        let oauthPublicJwk: JWK

        beforeAll(async () => {
            const { publicKey, privateKey } = await generateKeyPair('RS256')
            oauthPrivateKey = privateKey
            oauthPublicJwk = {
                ...(await exportJWK(publicKey)),
                kid: OAUTH_KEY_ID,
                alg: 'RS256',
                use: 'sig',
            }
        })

        beforeEach(async () => {
            await store.addIdp({
                id: 'idp-oauth',
                type: 'oauth',
                issuer: OAUTH_ISSUER,
                configUrl,
            })
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    issuer: OAUTH_ISSUER,
                    jwks_uri: OAUTH_JWKS_URI,
                }),
            } as Response)
            mockCreateRemoteJWKSet.mockImplementation(() =>
                createLocalJWKSet({ keys: [oauthPublicJwk] })
            )
        })

        it('returns auth context when JWT verifies and audience matches', async () => {
            await store.addNetwork(
                createOAuthNetwork('network-1', 'idp-oauth', 'ledger-audience')
            )

            const service = jwtAuthService(store, mockLogger)
            const token = await rs256BearerToken(
                {
                    iss: OAUTH_ISSUER,
                    sub: 'oauth-user',
                    aud: 'ledger-audience',
                    scope: 'openid',
                    email: 'oauth@example.com',
                },
                oauthPrivateKey
            )
            const rawJwt = token.split(' ')[1]

            const result = await service.verifyToken(token)

            expect(mockFetch).toHaveBeenCalledWith(configUrl, {
                headers: { Accept: 'application/json' },
            })
            expect(mockCreateRemoteJWKSet).toHaveBeenCalledWith(
                new URL(OAUTH_JWKS_URI),
                expect.any(Object)
            )
            expect(result).toEqual({
                userId: 'oauth-user',
                accessToken: rawJwt,
                email: 'oauth@example.com',
            })
        })

        it('returns undefined when no networks are configured for the IDP', async () => {
            const service = jwtAuthService(store, mockLogger)
            const token = await rs256BearerToken(
                {
                    iss: OAUTH_ISSUER,
                    sub: 'oauth-user',
                    aud: 'ledger-audience',
                    scope: 'openid',
                },
                oauthPrivateKey
            )

            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })

        it('returns undefined when verified JWT has no subject', async () => {
            await store.addNetwork(
                createOAuthNetwork(
                    'network-1',
                    'idp-oauth',
                    'expected-audience'
                )
            )

            const service = jwtAuthService(store, mockLogger)
            const token = await rs256BearerToken(
                {
                    iss: OAUTH_ISSUER,
                    aud: 'expected-audience',
                    scope: 'openid',
                },
                oauthPrivateKey
            )

            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })

        it('returns undefined when JWT verification fails', async () => {
            await store.addNetwork(
                createOAuthNetwork(
                    'network-1',
                    'idp-oauth',
                    'expected-audience'
                )
            )

            const service = jwtAuthService(store, mockLogger)
            const token = await hs256BearerToken({
                iss: OAUTH_ISSUER,
                sub: 'oauth-user',
                aud: 'expected-audience',
                scope: 'openid',
            })

            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })

        describe('audience, issuer and claim validation', () => {
            const oauthClaims = (
                extras: Record<string, unknown> = {}
            ): Record<string, unknown> => ({
                iss: OAUTH_ISSUER,
                sub: 'oauth-user',
                scope: 'openid',
                ...extras,
            })

            const verify = async (
                claims: Record<string, unknown>,
                key = oauthPrivateKey
            ) =>
                jwtAuthService(store, mockLogger).verifyToken(
                    await rs256BearerToken(claims, key)
                )

            it('accepts a token for any network of the IDP, not only a specific one', async () => {
                await store.addNetwork(
                    createOAuthNetwork('network-a', 'idp-oauth', 'aud-a')
                )
                await store.addNetwork(
                    createOAuthNetwork('network-b', 'idp-oauth', 'aud-b')
                )

                await expect(
                    verify(oauthClaims({ aud: 'aud-a' }))
                ).resolves.toMatchObject({ userId: 'oauth-user' })
                await expect(
                    verify(oauthClaims({ aud: 'aud-b' }))
                ).resolves.toMatchObject({ userId: 'oauth-user' })
            })

            it('accepts an array with a matching audience', async () => {
                await store.addNetwork(
                    createOAuthNetwork('network-a', 'idp-oauth', 'aud-a')
                )

                await expect(
                    verify(oauthClaims({ aud: ['other', 'aud-a'] }))
                ).resolves.toMatchObject({ userId: 'oauth-user' })
            })

            it.each<[string, unknown]>([
                ['nonmatching string', 'other'],
                ['nonmatching array', ['x', 'y']],
                ['missing', undefined],
                ['empty array', []],
                ['empty string', ''],
                ['non-string array', [123]],
            ])('rejects a %s audience', async (_name, aud) => {
                await store.addNetwork(
                    createOAuthNetwork('network-a', 'idp-oauth', 'aud-a')
                )

                await expect(
                    verify(oauthClaims({ aud }))
                ).resolves.toBeUndefined()
            })

            it('does not match audiences of networks that use another IDP', async () => {
                await store.addIdp({
                    id: 'idp-other',
                    type: 'oauth',
                    issuer: 'https://other.example.com',
                    configUrl: 'https://other.example.com/.well-known/c',
                })
                await store.addNetwork(
                    createOAuthNetwork('network-a', 'idp-oauth', 'aud-a')
                )
                await store.addNetwork(
                    createOAuthNetwork('network-z', 'idp-other', 'aud-z')
                )

                await expect(
                    verify(oauthClaims({ aud: 'aud-z' }))
                ).resolves.toBeUndefined()
                await expect(
                    verify(oauthClaims({ aud: 'aud-a' }))
                ).resolves.toMatchObject({ userId: 'oauth-user' })
            })

            it('ignores networks without an audience and never matches an empty audience', async () => {
                await store.addNetwork(
                    createOAuthNetwork('network-empty', 'idp-oauth', '')
                )

                await expect(
                    verify(oauthClaims({ aud: '' }))
                ).resolves.toBeUndefined()
                await expect(
                    verify(oauthClaims({ aud: 'anything' }))
                ).resolves.toBeUndefined()

                await store.addNetwork(
                    createOAuthNetwork('network-a', 'idp-oauth', 'aud-a')
                )
                await expect(
                    verify(oauthClaims({ aud: 'aud-a' }))
                ).resolves.toMatchObject({ userId: 'oauth-user' })
                await expect(
                    verify(oauthClaims({ aud: '' }))
                ).resolves.toBeUndefined()
            })

            it('rejects an expired token and a token that is not yet valid', async () => {
                await store.addNetwork(
                    createOAuthNetwork('network-a', 'idp-oauth', 'aud-a')
                )
                const now = Math.floor(Date.now() / 1000)

                await expect(
                    verify(oauthClaims({ aud: 'aud-a', exp: now - 3600 }))
                ).resolves.toBeUndefined()
                await expect(
                    verify(oauthClaims({ aud: 'aud-a', nbf: now + 3600 }))
                ).resolves.toBeUndefined()
                await expect(
                    verify(oauthClaims({ aud: 'aud-a', exp: now + 3600 }))
                ).resolves.toMatchObject({ userId: 'oauth-user' })
            })

            it('rejects a token signed with a key that is not in the JWKS', async () => {
                await store.addNetwork(
                    createOAuthNetwork('network-a', 'idp-oauth', 'aud-a')
                )
                const { privateKey: otherKey } = await generateKeyPair('RS256')

                await expect(
                    verify(oauthClaims({ aud: 'aud-a' }), otherKey)
                ).resolves.toBeUndefined()
            })

            it('throws IdpUnavailableError when the discovery document has no jwks_uri', async () => {
                await store.addNetwork(
                    createOAuthNetwork('network-a', 'idp-oauth', 'aud-a')
                )
                mockFetch.mockResolvedValue({
                    ok: true,
                    status: 200,
                    json: async () => ({ issuer: OAUTH_ISSUER }),
                } as Response)

                await expect(
                    verify(oauthClaims({ aud: 'aud-a' }))
                ).rejects.toBeInstanceOf(IdpUnavailableError)
            })

            it('throws IdpUnavailableError when the discovery document issuer does not match the IDP', async () => {
                await store.addNetwork(
                    createOAuthNetwork('network-a', 'idp-oauth', 'aud-a')
                )
                for (const issuer of [
                    'https://evil.example.com',
                    `${OAUTH_ISSUER}/`,
                    undefined,
                ]) {
                    mockFetch.mockResolvedValue({
                        ok: true,
                        status: 200,
                        json: async () => ({
                            issuer,
                            jwks_uri: OAUTH_JWKS_URI,
                        }),
                    } as Response)

                    await expect(
                        verify(oauthClaims({ aud: 'aud-a' }))
                    ).rejects.toBeInstanceOf(IdpUnavailableError)
                }
                expect(mockCreateRemoteJWKSet).not.toHaveBeenCalled()
            })

            it('throws IdpUnavailableError when the discovery request fails', async () => {
                await store.addNetwork(
                    createOAuthNetwork('network-a', 'idp-oauth', 'aud-a')
                )
                mockFetch.mockRejectedValue(new TypeError('fetch failed'))

                await expect(
                    verify(oauthClaims({ aud: 'aud-a' }))
                ).rejects.toBeInstanceOf(IdpUnavailableError)
            })

            it('throws IdpUnavailableError when the discovery document is malformed', async () => {
                await store.addNetwork(
                    createOAuthNetwork('network-a', 'idp-oauth', 'aud-a')
                )
                mockFetch.mockResolvedValue({
                    ok: true,
                    status: 200,
                    json: async () => ({ issuer: 42 }),
                } as Response)

                await expect(
                    verify(oauthClaims({ aud: 'aud-a' }))
                ).rejects.toBeInstanceOf(IdpUnavailableError)
            })

            describe('JWKS retrieval', () => {
                // Use jose's real remote JWKS handling, only the network is mocked
                const mockJwksResponse = (
                    jwksResult: (init?: RequestInit) => Promise<Response>
                ) => {
                    mockCreateRemoteJWKSet.mockImplementation(
                        (...args: unknown[]) =>
                            jose.createRemoteJWKSet(
                                ...(args as Parameters<
                                    typeof jose.createRemoteJWKSet
                                >)
                            )
                    )
                    mockFetch.mockImplementation(
                        async (url: string, init?: RequestInit) =>
                            url === configUrl
                                ? {
                                      ok: true,
                                      status: 200,
                                      json: async () => ({
                                          issuer: OAUTH_ISSUER,
                                          jwks_uri: OAUTH_JWKS_URI,
                                      }),
                                  }
                                : jwksResult(init)
                    )
                }

                beforeEach(async () => {
                    await store.addNetwork(
                        createOAuthNetwork('network-a', 'idp-oauth', 'aud-a')
                    )
                })

                it('verifies a token with the fetched JWKS', async () => {
                    mockJwksResponse(async () =>
                        Response.json({ keys: [oauthPublicJwk] })
                    )

                    await expect(
                        verify(oauthClaims({ aud: 'aud-a' }))
                    ).resolves.toMatchObject({ userId: 'oauth-user' })
                })

                it('fetches discovery and JWKS once across verifications', async () => {
                    mockJwksResponse(async () =>
                        Response.json({ keys: [oauthPublicJwk] })
                    )
                    const service = jwtAuthService(store, mockLogger)
                    const token = await rs256BearerToken(
                        oauthClaims({ aud: 'aud-a' }),
                        oauthPrivateKey
                    )

                    await expect(
                        service.verifyToken(token)
                    ).resolves.toMatchObject({ userId: 'oauth-user' })
                    await expect(
                        service.verifyToken(token)
                    ).resolves.toMatchObject({ userId: 'oauth-user' })
                    await expect(
                        service.verifyToken(token)
                    ).resolves.toMatchObject({ userId: 'oauth-user' })

                    expect(mockFetch).toHaveBeenCalledTimes(2)
                    expect(mockFetch).toHaveBeenCalledWith(
                        configUrl,
                        expect.anything()
                    )
                    expect(mockFetch).toHaveBeenCalledWith(
                        OAUTH_JWKS_URI,
                        expect.anything()
                    )
                })

                it('throws IdpUnavailableError when the JWKS is served with a non-200 success status', async () => {
                    mockJwksResponse(async () =>
                        Response.json(
                            { keys: [oauthPublicJwk] },
                            { status: 203 }
                        )
                    )

                    await expect(
                        verify(oauthClaims({ aud: 'aud-a' }))
                    ).rejects.toBeInstanceOf(IdpUnavailableError)
                })

                it('throws IdpUnavailableError when the JWKS request fails', async () => {
                    mockJwksResponse(async () => {
                        throw new TypeError('fetch failed')
                    })

                    await expect(
                        verify(oauthClaims({ aud: 'aud-a' }))
                    ).rejects.toBeInstanceOf(IdpUnavailableError)
                })

                it('throws IdpUnavailableError when the JWKS request times out', async () => {
                    // jose aborts the request through AbortSignal.timeout,
                    // let it time out right away
                    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(
                        AbortSignal.abort(
                            new DOMException('timed out', 'TimeoutError')
                        )
                    )
                    mockJwksResponse(async (init) => {
                        init?.signal?.throwIfAborted()
                        throw new Error('Expected the request to be aborted')
                    })

                    const result = verify(oauthClaims({ aud: 'aud-a' }))
                    await expect(result).rejects.toBeInstanceOf(
                        IdpUnavailableError
                    )
                    await expect(result).rejects.toThrow(
                        'Failed to fetch JWKS: timed out'
                    )
                })

                it('throws IdpUnavailableError when the JWKS endpoint returns an error status', async () => {
                    mockJwksResponse(
                        async () =>
                            new Response(null, {
                                status: 503,
                                statusText: 'Service Unavailable',
                            })
                    )

                    await expect(
                        verify(oauthClaims({ aud: 'aud-a' }))
                    ).rejects.toBeInstanceOf(IdpUnavailableError)
                })

                it('throws IdpUnavailableError when the JWKS response is not JSON', async () => {
                    mockJwksResponse(
                        async () =>
                            new Response('<html>maintenance</html>', {
                                status: 200,
                            })
                    )

                    await expect(
                        verify(oauthClaims({ aud: 'aud-a' }))
                    ).rejects.toBeInstanceOf(IdpUnavailableError)
                })

                it.each([{ error: 'maintenance' }, { keys: ['not-a-key'] }])(
                    'throws IdpUnavailableError when the JWKS response %j is not a key set',
                    async (body) => {
                        mockJwksResponse(async () => Response.json(body))

                        await expect(
                            verify(oauthClaims({ aud: 'aud-a' }))
                        ).rejects.toBeInstanceOf(IdpUnavailableError)
                    }
                )

                it('throws IdpUnavailableError when the JWKS contains a private key', async () => {
                    // jose only rejects it once the key is used
                    const { privateKey } = await generateKeyPair('RS256', {
                        extractable: true,
                    })
                    const privateJwk = {
                        ...(await exportJWK(privateKey)),
                        kid: OAUTH_KEY_ID,
                    }
                    mockJwksResponse(async () =>
                        Response.json({ keys: [privateJwk] })
                    )

                    await expect(
                        verify(oauthClaims({ aud: 'aud-a' }))
                    ).rejects.toBeInstanceOf(IdpUnavailableError)
                })

                it('recovers once the IDP serves a usable JWKS again', async () => {
                    const { privateKey } = await generateKeyPair('RS256', {
                        extractable: true,
                    })
                    let jwks: JWK[] = [
                        { ...(await exportJWK(privateKey)), kid: OAUTH_KEY_ID },
                    ]
                    mockJwksResponse(async () => Response.json({ keys: jwks }))
                    const service = jwtAuthService(store, mockLogger)
                    const token = await rs256BearerToken(
                        oauthClaims({ aud: 'aud-a' }),
                        oauthPrivateKey
                    )

                    await expect(
                        service.verifyToken(token)
                    ).rejects.toBeInstanceOf(IdpUnavailableError)

                    jwks = [oauthPublicJwk]
                    await expect(
                        service.verifyToken(token)
                    ).resolves.toMatchObject({ userId: 'oauth-user' })
                })

                it('still rejects an invalid token with undefined when the JWKS is available', async () => {
                    mockJwksResponse(async () =>
                        Response.json({ keys: [oauthPublicJwk] })
                    )
                    const { privateKey: otherKey } =
                        await generateKeyPair('RS256')

                    await expect(
                        verify(oauthClaims({ aud: 'aud-a' }), otherKey)
                    ).resolves.toBeUndefined()
                    await expect(
                        verify(oauthClaims({ aud: 'wrong' }))
                    ).resolves.toBeUndefined()
                })

                it('rejects a token with an unknown key id with undefined', async () => {
                    mockJwksResponse(async () =>
                        Response.json({
                            keys: [{ ...oauthPublicJwk, kid: 'another-key' }],
                        })
                    )

                    await expect(
                        verify(oauthClaims({ aud: 'aud-a' }))
                    ).resolves.toBeUndefined()
                })
            })

            it('throws IdpUnavailableError when the discovery request returns an error status', async () => {
                await store.addNetwork(
                    createOAuthNetwork('network-a', 'idp-oauth', 'aud-a')
                )
                mockFetch.mockResolvedValue({
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error',
                } as Response)

                await expect(
                    verify(oauthClaims({ aud: 'aud-a' }))
                ).rejects.toBeInstanceOf(IdpUnavailableError)
            })

            describe('caching', () => {
                const USERINFO_ENDPOINT = 'https://oauth.example.com/userinfo'

                let service: AuthService
                const verifyWithService = async (
                    claims: Record<string, unknown>
                ) =>
                    service.verifyToken(
                        await rs256BearerToken(claims, oauthPrivateKey)
                    )
                const fetchCount = (url: string) =>
                    mockFetch.mock.calls.filter(([u]) => String(u) === url)
                        .length

                beforeEach(async () => {
                    await store.addNetwork(
                        createOAuthNetwork('network-a', 'idp-oauth', 'aud-a')
                    )
                    service = jwtAuthService(store, mockLogger)
                })

                it('recovers once the IDP serves a valid discovery document again', async () => {
                    mockFetch.mockResolvedValueOnce(
                        Response.json({ issuer: OAUTH_ISSUER })
                    )

                    await expect(
                        verifyWithService(oauthClaims({ aud: 'aud-a' }))
                    ).rejects.toBeInstanceOf(IdpUnavailableError)
                    await expect(
                        verifyWithService(oauthClaims({ aud: 'aud-a' }))
                    ).resolves.toMatchObject({ userId: 'oauth-user' })
                })

                describe('userinfo email', () => {
                    let userInfoResponse: () => Response
                    let discoveryResponse: () => Response

                    beforeEach(() => {
                        userInfoResponse = () =>
                            Response.json({
                                sub: 'oauth-user',
                                email: 'userinfo@example.com',
                            })
                        discoveryResponse = () =>
                            Response.json({
                                issuer: OAUTH_ISSUER,
                                jwks_uri: OAUTH_JWKS_URI,
                                userinfo_endpoint: USERINFO_ENDPOINT,
                            })
                        mockFetch.mockImplementation(async (url: string) =>
                            url === USERINFO_ENDPOINT
                                ? userInfoResponse()
                                : discoveryResponse()
                        )
                    })

                    it('fetches the userinfo once per access token', async () => {
                        await expect(
                            verifyWithService(oauthClaims({ aud: 'aud-a' }))
                        ).resolves.toMatchObject({
                            email: 'userinfo@example.com',
                        })
                        await expect(
                            verifyWithService(oauthClaims({ aud: 'aud-a' }))
                        ).resolves.toMatchObject({
                            email: 'userinfo@example.com',
                        })
                        expect(fetchCount(USERINFO_ENDPOINT)).toBe(1)

                        // Another token of the same user may have other scopes
                        await verifyWithService(
                            oauthClaims({
                                aud: 'aud-a',
                                scope: 'openid email',
                            })
                        )
                        expect(fetchCount(USERINFO_ENDPOINT)).toBe(2)
                    })

                    it('skips the userinfo when the token has an email', async () => {
                        await expect(
                            verifyWithService(
                                oauthClaims({
                                    aud: 'aud-a',
                                    email: 'token@example.com',
                                })
                            )
                        ).resolves.toMatchObject({ email: 'token@example.com' })
                        expect(fetchCount(USERINFO_ENDPOINT)).toBe(0)
                    })

                    it('resolves without email and retries when the userinfo request fails', async () => {
                        userInfoResponse = () =>
                            new Response(null, { status: 503 })

                        const result = await verifyWithService(
                            oauthClaims({ aud: 'aud-a' })
                        )
                        expect(result).toMatchObject({ userId: 'oauth-user' })
                        expect(result).not.toHaveProperty('email')

                        await verifyWithService(oauthClaims({ aud: 'aud-a' }))
                        expect(fetchCount(USERINFO_ENDPOINT)).toBe(2)
                    })

                    it('ignores a userinfo response about another user', async () => {
                        userInfoResponse = () =>
                            Response.json({
                                sub: 'other-user',
                                email: 'other@example.com',
                            })

                        const result = await verifyWithService(
                            oauthClaims({ aud: 'aud-a' })
                        )
                        expect(result).toMatchObject({ userId: 'oauth-user' })
                        expect(result).not.toHaveProperty('email')
                    })
                })
            })
        })
    })

    describe('self-issued tokens (iss === sub)', () => {
        let ed25519PrivateKey: CryptoKey
        let walletPublicKey: string

        beforeAll(async () => {
            const { publicKey, privateKey } = await generateKeyPair('EdDSA')
            ed25519PrivateKey = privateKey
            walletPublicKey = await rawEd25519PublicKeyBase64(publicKey)
        })

        beforeEach(async () => {
            await store.addNetwork(createSelfIssuedNetwork())
            await store.addWallet(selfIssuedWallet(walletPublicKey))
        })

        it('returns auth context for a valid self-issued token', async () => {
            const service = jwtAuthService(store, mockLogger)
            const token = await eddsaBearerToken(
                selfIssuedClaims(),
                ed25519PrivateKey
            )

            const result = await service.verifyToken(token)
            expect(result).toEqual({
                userId: SELF_ISSUED_USER_ID,
                accessToken: token.split(' ')[1],
            })
        })

        it('includes email when present in the token', async () => {
            const service = jwtAuthService(store, mockLogger)
            const token = await eddsaBearerToken(
                selfIssuedClaims({ email: 'alice@example.com' }),
                ed25519PrivateKey
            )

            await expect(service.verifyToken(token)).resolves.toEqual({
                userId: SELF_ISSUED_USER_ID,
                accessToken: token.split(' ')[1],
                email: 'alice@example.com',
            })
        })

        it('returns undefined when daml.com.usr is missing', async () => {
            const service = jwtAuthService(store, mockLogger)
            const token = await eddsaBearerToken(
                {
                    iss: SELF_ISSUED_PARTY_ID,
                    sub: SELF_ISSUED_PARTY_ID,
                    aud: SELF_ISSUED_AUDIENCE,
                    exp: Math.floor(Date.now() / 1000) + 3600,
                },
                ed25519PrivateKey
            )

            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })

        it('returns undefined when no wallet matches user and party', async () => {
            const service = jwtAuthService(store, mockLogger)
            const token = await eddsaBearerToken(
                selfIssuedClaims({
                    iss: 'unknown::namespace',
                    sub: 'unknown::namespace',
                }),
                ed25519PrivateKey
            )

            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })

        it('returns undefined when the audience does not match the wallet network', async () => {
            const service = jwtAuthService(store, mockLogger)
            const token = await eddsaBearerToken(
                selfIssuedClaims({ aud: 'other-audience' }),
                ed25519PrivateKey
            )

            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })

        it('returns undefined when the JWT has no audience', async () => {
            const service = jwtAuthService(store, mockLogger)
            const claims = selfIssuedClaims()
            delete claims.aud
            const token = await eddsaBearerToken(claims, ed25519PrivateKey)

            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })

        it('returns undefined when the signature does not match the wallet public key', async () => {
            const { privateKey: otherKey } = await generateKeyPair('EdDSA')
            const service = jwtAuthService(store, mockLogger)
            const token = await eddsaBearerToken(selfIssuedClaims(), otherKey)

            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })

        it('returns undefined when the token is expired', async () => {
            const service = jwtAuthService(store, mockLogger)
            const token = await eddsaBearerToken(
                selfIssuedClaims({
                    exp: Math.floor(Date.now() / 1000) - 60,
                }),
                ed25519PrivateKey
            )

            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })

        it('returns undefined when the JWT has no exp', async () => {
            const service = jwtAuthService(store, mockLogger)
            const claims = selfIssuedClaims()
            delete claims.exp
            const token = await eddsaBearerToken(claims, ed25519PrivateKey)

            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })

        it('returns undefined when isAuthParty is false', async () => {
            const { publicKey, privateKey } = await generateKeyPair('EdDSA')
            const otherParty = 'bob::namespace'
            await store.addWallet(
                selfIssuedWallet(await rawEd25519PublicKeyBase64(publicKey), {
                    partyId: otherParty,
                    primary: false,
                    isAuthParty: false,
                })
            )

            const service = jwtAuthService(store, mockLogger)
            const token = await eddsaBearerToken(
                selfIssuedClaims({
                    iss: otherParty,
                    sub: otherParty,
                }),
                privateKey
            )

            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })

        it('returns undefined when isAuthParty is missing', async () => {
            const { publicKey, privateKey } = await generateKeyPair('EdDSA')
            const otherParty = 'carol::namespace'
            await store.addWallet(
                selfIssuedWallet(await rawEd25519PublicKeyBase64(publicKey), {
                    partyId: otherParty,
                    primary: false,
                    isAuthParty: undefined,
                })
            )

            const service = jwtAuthService(store, mockLogger)
            const token = await eddsaBearerToken(
                selfIssuedClaims({
                    iss: otherParty,
                    sub: otherParty,
                }),
                privateKey
            )

            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })

        it('selects the wallet on the self-issued network matching the token audience', async () => {
            const { publicKey, privateKey } = await generateKeyPair('EdDSA')
            const otherAudience = 'other-self-issued-audience'
            const otherNetworkId = 'network-self-issued-2'
            await store.addNetwork(
                createSelfIssuedNetwork(otherNetworkId, otherAudience)
            )
            await store.addWallet(
                selfIssuedWallet(await rawEd25519PublicKeyBase64(publicKey), {
                    networkId: otherNetworkId,
                    primary: false,
                })
            )

            const service = jwtAuthService(store, mockLogger)
            const token = await eddsaBearerToken(
                selfIssuedClaims({ aud: otherAudience }),
                privateKey
            )

            await expect(service.verifyToken(token)).resolves.toEqual({
                userId: SELF_ISSUED_USER_ID,
                accessToken: token.split(' ')[1],
            })
        })

        it('returns undefined when multiple self-issued networks share the token audience', async () => {
            const collidingStore = new StoreInternal(
                {
                    idps: [],
                    networks: [
                        createSelfIssuedNetwork('n1', SELF_ISSUED_AUDIENCE),
                        createSelfIssuedNetwork('n2', SELF_ISSUED_AUDIENCE),
                    ],
                },
                getLogger('mock'),
                authContext
            )
            await collidingStore.addWallet(selfIssuedWallet(walletPublicKey))

            const service = jwtAuthService(collidingStore, mockLogger)
            const token = await eddsaBearerToken(
                selfIssuedClaims(),
                ed25519PrivateKey
            )

            await expect(service.verifyToken(token)).resolves.toBeUndefined()
        })
    })
})
