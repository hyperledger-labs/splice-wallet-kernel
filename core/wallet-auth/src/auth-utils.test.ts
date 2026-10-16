// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    jwtUserEmail,
    jwtUserId,
    assertConnected,
    fetchOidcUserInfo,
    jwtExpired,
    resolveUserEmail,
} from './auth-utils.js'
import type { Idp } from './config/schema.js'
import type { TokenProviderConfig } from './auth-token-provider.js'
import { SelfSignedTokenService } from './self-signed-token-service.js'
import { configure, reset } from '@logtape/logtape'
import { createLogRecorder } from '@logtape/testing/recorder'

const recorder = createLogRecorder()

describe('Auth Utils', () => {
    const fetchMock = vi.fn()
    beforeEach(() => {
        vi.stubGlobal('fetch', fetchMock)
    })

    afterEach(() => {
        vi.resetAllMocks()
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

    it('should fetch oidc user info if both the fetches return a correct config', async () => {
        const mockConfigResponse = { userinfo_endpoint: 'https://userinfo' }
        const mockUserInfoResponse = { userInfo: 'user-id' }

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
