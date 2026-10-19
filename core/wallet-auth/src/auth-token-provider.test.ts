// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach } from 'vitest'
import { assertConnected, jwtExpired } from './auth-utils.js'
import {
    AuthTokenProvider,
    type TokenProviderConfig,
} from './auth-token-provider.js'
import type { Auth, Idp } from './config/schema.js'
import { clientCredentialsService } from './client-credentials-service.js'
import { SelfSignedTokenService } from './self-signed-token-service.js'
import { SignJWT } from 'jose'

vi.mock('./client-credentials-service.js', () => {
    return {
        clientCredentialsService: vi.fn(() => ({
            fetchToken: vi.fn(),
        })),
    }
})

describe('AuthTokenProvider', () => {
    afterEach(() => {
        vi.resetAllMocks()
        vi.useRealTimers()
    })

    const configUrl = 'http://idp/.well-known/openid-configuration'
    const tokenProviderConfig: TokenProviderConfig = {
        method: 'self_signed',
        issuer: 'unsafe-auth',
        credentials: {
            clientId: 'ledger-api-user',
            clientSecret: 'unsafe',
            audience: 'https://canton.network.global',
            scope: '',
        },
    }
    it('should test an auth token provider initialization from TokenProviderConfig', async () => {
        const authProvider = new AuthTokenProvider(tokenProviderConfig)

        const authContext = await authProvider.getAuthContext()
        expect(assertConnected(authContext)).toBe(authContext)
        expect(jwtExpired(authContext.accessToken)).toBeFalsy()
    })

    it('should test an auth token provider initialization with fromToken', async () => {
        const token = await SelfSignedTokenService.fetchToken(
            tokenProviderConfig.credentials,
            tokenProviderConfig.issuer
        )

        const authProviderFromToken = AuthTokenProvider.fromToken(token)
        const authContext = await authProviderFromToken.getAuthContext()
        expect(assertConnected(authContext)).toBe(authContext)
    })

    it('should test an auth token provider initialization with fromGatewayConfig', async () => {
        const idp: Idp = {
            id: 'test1',
            type: 'self_signed',
            issuer: 'unsafe-auth',
        }

        const auth: Auth = {
            method: 'self_signed',
            issuer: 'unsafe-auth',
            clientId: 'ledger-api-user',
            clientSecret: 'unsafe',
            audience: 'https://canton.network.global',
            scope: '',
        }

        const authProviderFromGateway = AuthTokenProvider.fromGatewayConfig(
            idp,
            auth
        )

        const authContext = await authProviderFromGateway.getAuthContext()
        expect(assertConnected(authContext)).toBe(authContext)
    })

    it('should test an auth token provider initialization with fromGatewayConfig with oauth', async () => {
        const authProvider = new AuthTokenProvider(tokenProviderConfig)

        const token = await authProvider.getAccessToken()

        const idp: Idp = {
            id: 'test1',
            type: 'oauth',
            issuer: 'unsafe-auth',
            configUrl,
        }

        const auth: Auth = {
            method: 'client_credentials',
            clientId: 'ledger-api-user',
            clientSecret: 'unsafe',
            audience: 'https://canton.network.global',
            scope: '',
        }

        const mockedServiceFactory = vi.mocked(clientCredentialsService)

        const mockFetchToken = vi.fn().mockResolvedValue(token)

        mockedServiceFactory.mockReturnValue({ fetchToken: mockFetchToken })

        const authProviderFromGateway = AuthTokenProvider.fromGatewayConfig(
            idp,
            auth
        )

        const authContext = await authProviderFromGateway.getAuthContext()
        expect(assertConnected(authContext)).toBe(authContext)
    })

    it('rejects client credentials with a non-oauth IDP', () => {
        expect(() =>
            AuthTokenProvider.fromGatewayConfig(
                {
                    id: 'self-signed',
                    type: 'self_signed',
                    issuer: 'unsafe-auth',
                },
                {
                    method: 'client_credentials',
                    clientId: 'user',
                    clientSecret: 'secret',
                    audience: 'audience',
                    scope: '',
                }
            )
        ).toThrow(
            'IDP type self_signed not supported for client_credentials auth'
        )
    })

    it.each<Auth>([
        {
            method: 'authorization_code',
            clientId: 'user',
            audience: 'audience',
            scope: '',
        },
        { method: 'self_issued', audience: 'audience', scope: '' },
    ])('rejects $method for programmatic access', (auth) => {
        expect(() =>
            AuthTokenProvider.fromGatewayConfig(
                { id: 'self-issued', type: 'self_issued' },
                auth
            )
        ).toThrow(
            `Auth method ${auth.method} not supported for programmatic access token`
        )
    })

    it('caches valid tokens and refreshes them at expiry', async () => {
        vi.useFakeTimers()
        const now = Math.floor(Date.now() / 1000)
        const secret = new TextEncoder().encode('unsafe')
        const firstToken = await new SignJWT({ sub: 'user' })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime(now + 60)
            .sign(secret)
        const refreshedToken = await new SignJWT({
            sub: 'user',
            email: 'user@example.com',
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime(now + 120)
            .sign(secret)
        const fetchToken = vi
            .fn()
            .mockResolvedValueOnce(firstToken)
            .mockResolvedValueOnce(refreshedToken)
        vi.mocked(clientCredentialsService).mockReturnValue({ fetchToken })
        const provider = new AuthTokenProvider({
            method: 'client_credentials',
            configUrl,
            credentials: tokenProviderConfig.credentials,
        })

        expect(await provider.getAccessToken()).toBe(firstToken)
        expect(await provider.getAccessToken()).toBe(firstToken)
        expect(fetchToken).toHaveBeenCalledTimes(1)

        vi.setSystemTime((now + 60) * 1000)
        expect(await provider.getAuthContext()).toEqual({
            userId: 'user',
            accessToken: refreshedToken,
            email: 'user@example.com',
        })
        expect(fetchToken).toHaveBeenCalledTimes(2)
        expect(fetchToken).toHaveBeenCalledWith(tokenProviderConfig.credentials)
    })

    it('rejects an expired token returned by the provider', async () => {
        const token = await new SignJWT({ sub: 'user', exp: 0 })
            .setProtectedHeader({ alg: 'HS256' })
            .sign(new TextEncoder().encode('secret'))

        await expect(
            AuthTokenProvider.fromToken(token).getAccessToken()
        ).rejects.toThrow(
            'Attempted to refresh a token, but it came back expired.'
        )
    })
})
