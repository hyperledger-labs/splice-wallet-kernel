// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    jwtUserEmail,
    jwtUserId,
    assertConnected,
    fetchOidcUserInfo,
    fetchOidcDiscovery,
    jwtExpired,
    resolveUserEmail,
} from './auth-utils.js'
import { IdpUnavailableError } from './auth-service.js'
import type { Idp } from './config/schema.js'
import type { TokenProviderConfig } from './auth-token-provider.js'
import { SelfSignedTokenService } from './self-signed-token-service.js'
import { configure, reset } from '@logtape/logtape'
import { createLogRecorder } from '@logtape/testing/recorder'
import { SignJWT } from 'jose'

const recorder = createLogRecorder()

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

    it('returns undefined without fetching userinfo when discovery omits the endpoint', async () => {
        fetchMock.mockResolvedValue(Response.json({}))

        expect(await fetchOidcUserInfo(configUrl, 'token')).toBeUndefined()
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('should fetch oidc user info if both the fetches return a correct config', async () => {
        const mockConfigResponse = { userinfo_endpoint: 'https://userinfo' }
        const mockUserInfoResponse = { sub: 'user-id', email: 'a@b.c' }

        const token = await SelfSignedTokenService.fetchToken(
            tokenProviderConfig.credentials,
            tokenProviderConfig.issuer
        )

        fetchMock.mockImplementation((url) => {
            if (url.includes('openid-configuration')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => mockConfigResponse,
                })
            }
            if (url.includes('userinfo')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => mockUserInfoResponse,
                })
            }

            return Promise.reject('')
        })

        const result = await fetchOidcUserInfo(configUrl, token)

        expect(result).toStrictEqual(mockUserInfoResponse)
    })

    it('should throw an error if fetch config fails', async () => {
        const token = await SelfSignedTokenService.fetchToken(
            tokenProviderConfig.credentials,
            tokenProviderConfig.issuer
        )

        fetchMock.mockImplementation(() => {
            return Promise.resolve({
                ok: false,
                json: async () => '',
                status: 400,
                statusText: 'Bad request',
            })
        })

        await expect(fetchOidcUserInfo(configUrl, token)).rejects.toThrow(
            `Failed to fetch OIDC discovery document: 400 Bad request`
        )
    })

    it('should throw an error if fetch userinfo fails', async () => {
        const mockConfigResponse = { userinfo_endpoint: 'https://userinfo' }

        const token = await SelfSignedTokenService.fetchToken(
            tokenProviderConfig.credentials,
            tokenProviderConfig.issuer
        )

        fetchMock.mockImplementation((url) => {
            if (url.includes('openid-configuration')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => mockConfigResponse,
                })
            }
            if (url.includes('userinfo')) {
                return Promise.resolve({
                    ok: false,
                    json: async () => '',
                    status: 400,
                    statusText: 'Bad request',
                })
            }

            return Promise.reject('')
        })

        await expect(fetchOidcUserInfo(configUrl, token)).rejects.toThrow(
            `Failed to fetch OIDC userinfo: 400 Bad request`
        )
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
            json: async () => ({ userinfo_endpoint: 42 }),
        })

        await expect(fetchOidcUserInfo(configUrl, 'token')).rejects.toThrow(
            'Invalid OIDC discovery document'
        )
    })

    it('should reject a userinfo response without sub', async () => {
        fetchMock.mockImplementation((url) =>
            Promise.resolve({
                ok: true,
                json: async () =>
                    url.includes('openid-configuration')
                        ? { userinfo_endpoint: 'https://userinfo' }
                        : { email: 'a@b.c' },
            })
        )

        await expect(fetchOidcUserInfo(configUrl, 'token')).rejects.toThrow(
            'Invalid OIDC userinfo response'
        )
    })

    describe('resolveUserEmail', () => {
        beforeEach(async () => {
            await configure({
                sinks: {
                    recorder: recorder.sink,
                },
                loggers: [
                    {
                        category: ['core'],
                        lowestLevel: 'debug',
                        sinks: ['recorder'],
                    },
                    { category: ['logtape', 'meta'], sinks: [] },
                ],
            })
        })

        afterEach(reset)

        const oauthIdp: Idp = {
            id: 'oauth-idp',
            type: 'oauth',
            issuer: 'https://idp.example.com',
            configUrl,
        }

        const selfSignedIdp: Idp = {
            id: 'self-signed-idp',
            type: 'self_signed',
            issuer: 'unsafe-auth',
        }

        it('returns email from authContext when already set', async () => {
            const email = await resolveUserEmail(
                {
                    userId: 'user',
                    accessToken: 'token',
                    email: 'user@example.com',
                },
                oauthIdp
            )

            expect(email).toBe('user@example.com')
            expect(fetchMock).not.toHaveBeenCalled()
        })

        it('returns undefined for non-oauth idp', async () => {
            const email = await resolveUserEmail(
                {
                    userId: 'user',
                    accessToken: 'token',
                },
                selfSignedIdp
            )

            expect(email).toBeUndefined()
            expect(fetchMock).not.toHaveBeenCalled()
        })

        it('fetches email from OIDC userinfo for oauth idp', async () => {
            fetchMock.mockImplementation((url) => {
                if (url.includes('openid-configuration')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({
                            userinfo_endpoint: 'https://userinfo',
                        }),
                    })
                }
                if (url.includes('userinfo')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({
                            sub: 'user',
                            email: 'fetched@example.com',
                        }),
                    })
                }

                return Promise.reject('')
            })

            const email = await resolveUserEmail(
                {
                    userId: 'user',
                    accessToken: 'access-token',
                },
                oauthIdp
            )

            expect(email).toBe('fetched@example.com')
        })

        it('returns undefined when userinfo has no email', async () => {
            fetchMock.mockImplementation((url) => {
                if (url.includes('openid-configuration')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({
                            userinfo_endpoint: 'https://userinfo',
                        }),
                    })
                }
                if (url.includes('userinfo')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({ sub: 'user' }),
                    })
                }

                return Promise.reject('')
            })

            const email = await resolveUserEmail(
                {
                    userId: 'user',
                    accessToken: 'access-token',
                },
                oauthIdp
            )

            expect(email).toBeUndefined()
        })

        it('returns undefined and logs when userinfo fetch fails', async () => {
            fetchMock.mockImplementation(() =>
                Promise.resolve({
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error',
                })
            )

            const email = await resolveUserEmail(
                {
                    userId: 'user',
                    accessToken: 'access-token',
                },
                oauthIdp
            )

            expect(email).toBeUndefined()

            recorder.assertLogged({
                category: ['core', 'wallet-auth', 'resolveUserEmail'],
                level: 'warning',
                message: 'Failed to resolve user email from OIDC userinfo',
            })
        })
    })
})
