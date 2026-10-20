// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    jwtUserEmail,
    jwtUserId,
    jwtExpiresAt,
    assertConnected,
    fetchOidcUserInfo,
    fetchOidcDiscovery,
    jwtExpired,
} from './auth-utils.js'
import { IdpUnavailableError } from './auth-service.js'
import type { TokenProviderConfig } from './auth-token-provider.js'
import { SelfSignedTokenService } from './self-signed-token-service.js'
import { SignJWT } from 'jose'

describe('Auth Utils', () => {
    const fetchMock = vi.fn()
    beforeEach(() => {
        vi.stubGlobal('fetch', fetchMock)
    })

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

    it('should verify components of a jwt token correctly', async () => {
        const token = await SelfSignedTokenService.fetchToken(
            tokenProviderConfig.credentials,
            tokenProviderConfig.issuer
        )

        const userId = jwtUserId(token)
        const optionalEmail = jwtUserEmail(token)
        const isExpired = jwtExpired(token)
        expect(userId).toBe('ledger-api-user')
        expect(optionalEmail).toBeUndefined()
        expect(isExpired).toBeFalsy()
    })
    it('should assert connected', async () => {
        const token = await SelfSignedTokenService.fetchToken(
            tokenProviderConfig.credentials,
            tokenProviderConfig.issuer
        )

        const authContext = {
            userId: 'user',
            accessToken: token,
        }
        expect(assertConnected(authContext)).toBe(authContext)
    })

    it('rejects a missing auth context', () => {
        expect(() => assertConnected(undefined)).toThrow(
            'User is not connected'
        )
    })

    it('rejects a JWT without a subject', async () => {
        const token = await new SignJWT({})
            .setProtectedHeader({ alg: 'HS256' })
            .sign(new TextEncoder().encode('secret'))

        expect(() => jwtUserId(token)).toThrow(
            'token did not contain a subject field'
        )
    })

    it.each([
        ['user@example.com', 'user@example.com'],
        ['', undefined],
        [42, undefined],
    ])('extracts email claim %j as %j', async (email, expected) => {
        const token = await new SignJWT({ email })
            .setProtectedHeader({ alg: 'HS256' })
            .sign(new TextEncoder().encode('secret'))

        expect(jwtUserEmail(token)).toBe(expected)
    })

    it('extracts the exp claim as a date', async () => {
        const token = await new SignJWT({ exp: 1000 })
            .setProtectedHeader({ alg: 'HS256' })
            .sign(new TextEncoder().encode('secret'))

        expect(jwtExpiresAt(token)).toEqual(new Date(1000 * 1000))
    })

    it('throws if the exp claim is missing', async () => {
        const token = await new SignJWT({})
            .setProtectedHeader({ alg: 'HS256' })
            .sign(new TextEncoder().encode('secret'))

        expect(() => jwtExpiresAt(token)).toThrow(
            'token did not contain an expiry field'
        )
    })

    it('decodes base64url payloads', async () => {
        // "auth0|abc?x" encodes to a payload containing `_`, which atob rejects
        const token = await new SignJWT({ sub: 'auth0|abc?x', exp: 1000 })
            .setProtectedHeader({ alg: 'HS256' })
            .sign(new TextEncoder().encode('secret'))

        expect(token.split('.')[1]).toMatch(/[-_]/)
        expect(jwtExpiresAt(token)).toEqual(new Date(1000 * 1000))
    })

    it.each([
        [undefined, false],
        [999, true],
        [1000, true],
        [1001, false],
    ])('checks expiry %j at the current second', async (exp, expected) => {
        vi.useFakeTimers()
        vi.setSystemTime(1000 * 1000)
        const token = await new SignJWT(exp === undefined ? {} : { exp })
            .setProtectedHeader({ alg: 'HS256' })
            .sign(new TextEncoder().encode('secret'))

        expect(jwtExpired(token)).toBe(expected)
    })

    it('treats a malformed JWT as expired', () => {
        expect(jwtExpired('not-a-jwt')).toBe(true)
    })

    it('should fetch oidc user info', async () => {
        const mockUserInfoResponse = { sub: 'user-id', email: 'a@b.c' }
        fetchMock.mockResolvedValue(Response.json(mockUserInfoResponse))

        const result = await fetchOidcUserInfo('https://userinfo', 'token')

        expect(result).toStrictEqual(mockUserInfoResponse)
        expect(fetchMock).toHaveBeenCalledWith('https://userinfo', {
            headers: {
                Accept: 'application/json',
                Authorization: 'Bearer token',
            },
        })
    })

    it('should throw an error if fetch userinfo fails', async () => {
        fetchMock.mockResolvedValue({
            ok: false,
            json: async () => '',
            status: 400,
            statusText: 'Bad request',
        })

        await expect(
            fetchOidcUserInfo('https://userinfo', 'token')
        ).rejects.toThrow(`Failed to fetch OIDC userinfo: 400 Bad request`)
    })

    it('should fail with IdpUnavailableError if the discovery request cannot be made', async () => {
        fetchMock.mockRejectedValue(new TypeError('fetch failed'))

        await expect(fetchOidcDiscovery(configUrl)).rejects.toBeInstanceOf(
            IdpUnavailableError
        )
    })

    it('should fail with IdpUnavailableError for an error status or malformed document', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
        })
        await expect(fetchOidcDiscovery(configUrl)).rejects.toBeInstanceOf(
            IdpUnavailableError
        )

        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => {
                throw new SyntaxError('Unexpected token <')
            },
        })
        await expect(fetchOidcDiscovery(configUrl)).rejects.toBeInstanceOf(
            IdpUnavailableError
        )
    })

    it('should reject a malformed discovery document', async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({ issuer: 42 }),
        })

        await expect(fetchOidcDiscovery(configUrl)).rejects.toThrow(
            'Invalid OIDC discovery document'
        )
    })

    it.each(['javascript:alert(1)', '', '/userinfo'])(
        'should treat the invalid endpoint %j as missing',
        async (userinfoEndpoint) => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => ({
                    userinfo_endpoint: userinfoEndpoint,
                    jwks_uri: 'https://idp.example.com/jwks',
                }),
            })

            await expect(fetchOidcDiscovery(configUrl)).resolves.toEqual({
                userinfo_endpoint: undefined,
                jwks_uri: 'https://idp.example.com/jwks',
            })
        }
    )

    it('should reject a userinfo response without sub', async () => {
        fetchMock.mockResolvedValue(Response.json({ email: 'a@b.c' }))

        await expect(
            fetchOidcUserInfo('https://userinfo', 'token')
        ).rejects.toThrow('Invalid OIDC userinfo response')
    })
})
