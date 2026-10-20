// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IdpUnavailableError } from './auth-service.js'
import { createOidcClient, OIDC_CACHE_TTL_MS } from './oidc-client.js'

describe('createOidcClient', () => {
    const configUrl = 'http://idp/.well-known/openid-configuration'
    const userinfoEndpoint = 'http://idp/userinfo'
    const issuer = 'http://idp'
    const discovery = { issuer, jwks_uri: 'http://idp/jwks' }

    const fetchMock = vi.fn()
    const fetchCount = (url: string) =>
        fetchMock.mock.calls.filter(([u]) => u === url).length

    beforeEach(() => {
        vi.stubGlobal('fetch', fetchMock)
        fetchMock.mockImplementation(async (url: string) =>
            url === configUrl
                ? Response.json(discovery)
                : Response.json({ sub: 'user', email: 'user@example.com' })
        )
    })

    afterEach(() => {
        vi.resetAllMocks()
        vi.unstubAllGlobals()
        vi.useRealTimers()
    })

    describe('fetchDiscovery', () => {
        it('reuses the discovery document until the TTL expires', async () => {
            vi.useFakeTimers({ toFake: ['Date'] })
            const oidc = createOidcClient()

            await expect(
                oidc.fetchDiscovery(configUrl, issuer)
            ).resolves.toEqual(discovery)
            vi.setSystemTime(Date.now() + OIDC_CACHE_TTL_MS - 1)
            await oidc.fetchDiscovery(configUrl, issuer)
            expect(fetchCount(configUrl)).toBe(1)

            vi.setSystemTime(Date.now() + 2)
            await oidc.fetchDiscovery(configUrl, issuer)
            expect(fetchCount(configUrl)).toBe(2)
        })

        it('does not cache a failed request', async () => {
            fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }))
            const oidc = createOidcClient()

            await expect(
                oidc.fetchDiscovery(configUrl, issuer)
            ).rejects.toBeInstanceOf(IdpUnavailableError)
            await expect(
                oidc.fetchDiscovery(configUrl, issuer)
            ).resolves.toEqual(discovery)
        })

        it.each([
            ['another issuer', { ...discovery, issuer: 'http://other' }],
            ['no jwks_uri', { issuer }],
            ['an invalid jwks_uri', { issuer, jwks_uri: 'not a url' }],
        ])(
            'rejects and does not cache a document with %s',
            async (_, invalid) => {
                fetchMock.mockResolvedValueOnce(Response.json(invalid))
                const oidc = createOidcClient()

                await expect(
                    oidc.fetchDiscovery(configUrl, issuer)
                ).rejects.toBeInstanceOf(IdpUnavailableError)
                await expect(
                    oidc.fetchDiscovery(configUrl, issuer)
                ).resolves.toEqual(discovery)
            }
        )

        it('caches the document per expected issuer', async () => {
            const oidc = createOidcClient()

            await oidc.fetchDiscovery(configUrl, issuer)
            await expect(
                oidc.fetchDiscovery(configUrl, 'http://other')
            ).rejects.toBeInstanceOf(IdpUnavailableError)
            expect(fetchCount(configUrl)).toBe(2)
        })

        it('does not share the cache between clients', async () => {
            await createOidcClient().fetchDiscovery(configUrl, issuer)
            await createOidcClient().fetchDiscovery(configUrl, issuer)

            expect(fetchCount(configUrl)).toBe(2)
        })
    })

    describe('fetchUserInfo', () => {
        it('reuses the userinfo per access token until the TTL expires', async () => {
            vi.useFakeTimers({ toFake: ['Date'] })
            const oidc = createOidcClient()

            await expect(
                oidc.fetchUserInfo(userinfoEndpoint, 'token-1', 'user')
            ).resolves.toEqual({ sub: 'user', email: 'user@example.com' })
            await oidc.fetchUserInfo(userinfoEndpoint, 'token-1', 'user')
            expect(fetchCount(userinfoEndpoint)).toBe(1)

            vi.setSystemTime(Date.now() + OIDC_CACHE_TTL_MS + 1)
            await oidc.fetchUserInfo(userinfoEndpoint, 'token-1', 'user')
            expect(fetchCount(userinfoEndpoint)).toBe(2)
        })

        it('fetches the userinfo again for another token of the same subject', async () => {
            const oidc = createOidcClient()
            // e.g. a token without the email scope
            fetchMock.mockResolvedValueOnce(Response.json({ sub: 'user' }))

            await expect(
                oidc.fetchUserInfo(userinfoEndpoint, 'token-1', 'user')
            ).resolves.toEqual({ sub: 'user' })
            await expect(
                oidc.fetchUserInfo(userinfoEndpoint, 'token-2', 'user')
            ).resolves.toEqual({ sub: 'user', email: 'user@example.com' })
            expect(fetchCount(userinfoEndpoint)).toBe(2)
        })

        it('does not cache a failed request', async () => {
            fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }))
            const oidc = createOidcClient()

            await expect(
                oidc.fetchUserInfo(userinfoEndpoint, 'token', 'user')
            ).rejects.toThrow()
            await expect(
                oidc.fetchUserInfo(userinfoEndpoint, 'token', 'user')
            ).resolves.toMatchObject({ email: 'user@example.com' })
        })

        it('rejects and does not cache a response about another subject', async () => {
            fetchMock.mockResolvedValueOnce(
                Response.json({ sub: 'other-user', email: 'other@example.com' })
            )
            const oidc = createOidcClient()

            await expect(
                oidc.fetchUserInfo(userinfoEndpoint, 'token', 'user')
            ).rejects.toThrow('does not match the token subject')
            await expect(
                oidc.fetchUserInfo(userinfoEndpoint, 'token', 'user')
            ).resolves.toMatchObject({ email: 'user@example.com' })
        })

        it('rejects a cached response for another subject', async () => {
            const oidc = createOidcClient()
            await oidc.fetchUserInfo(userinfoEndpoint, 'token', 'user')

            await expect(
                oidc.fetchUserInfo(userinfoEndpoint, 'token', 'other-user')
            ).rejects.toThrow('does not match the token subject')
        })
    })
})
