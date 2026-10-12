// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixture, waitUntil } from '@open-wc/testing-helpers'
import { html } from 'lit'

const {
    mockRedirectToIntendedOrDefault,
    mockAddUserSession,
    mockAccessTokenSet,
    mockExpirationDateSet,
    mockNetworkIdGet,
    mockHandleErrorToast,
} = vi.hoisted(() => ({
    mockRedirectToIntendedOrDefault: vi.fn(),
    mockAddUserSession: vi.fn().mockResolvedValue(undefined),
    mockAccessTokenSet: vi.fn(),
    mockExpirationDateSet: vi.fn(),
    mockNetworkIdGet: vi.fn(() => 'net-1'),
    mockHandleErrorToast: vi.fn(),
}))

vi.mock('../index.js', () => ({
    redirectToIntendedOrDefault: mockRedirectToIntendedOrDefault,
    addUserSession: mockAddUserSession,
}))
vi.mock('../state-manager.js', () => ({
    stateManager: {
        accessToken: { set: mockAccessTokenSet },
        expirationDate: { set: mockExpirationDateSet },
        networkId: { get: mockNetworkIdGet },
        currentOrigin: { get: vi.fn(), set: vi.fn(), clear: vi.fn() },
    },
}))
vi.mock('@canton-network/core-wallet-ui-components', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('@canton-network/core-wallet-ui-components')
        >()
    return { ...actual, handleErrorToast: mockHandleErrorToast }
})

import './index.js'
import type { LoginCallback } from './index.js'

const oauthState = {
    configUrl: 'https://idp.example/.well-known/openid-configuration',
    clientId: 'client-id',
    audience: 'audience',
    stateId: 'state-123',
}

function setCallbackUrl(code?: string, state?: Record<string, unknown>) {
    const params = new URLSearchParams()
    if (code) params.set('code', code)
    if (state) params.set('state', btoa(JSON.stringify(state)))
    history.replaceState({}, '', `?${params.toString()}`)
}

function tokenWithExpiry(exp?: number) {
    const payload = { exp: exp ?? Math.floor(Date.now() / 1000) + 3600 }
    return (
        'eyJ0eXAiOiJKV1QiLCJraWQiOiJrZXlfaWQiLCJhbGciOiJSUzI1NiJ9.' +
        btoa(JSON.stringify(payload)) +
        '.sig'
    )
}

function stubOAuthFetch(accessToken?: string) {
    vi.stubGlobal(
        'fetch',
        vi.fn(async (input: string | URL) => {
            const url = new URL(input).href
            if (url === oauthState.configUrl) {
                return new Response(
                    JSON.stringify({
                        token_endpoint: 'https://idp.example/token',
                    }),
                    { status: 200 }
                )
            }
            if (url === 'https://idp.example/token') {
                return new Response(
                    JSON.stringify(
                        accessToken ? { access_token: accessToken } : {}
                    ),
                    { status: 200 }
                )
            }
            return new Response('{}', { status: 404 })
        })
    )
}

function expectNoAuthSideEffects() {
    expect(mockAccessTokenSet).not.toHaveBeenCalled()
    expect(mockExpirationDateSet).not.toHaveBeenCalled()
    expect(mockAddUserSession).not.toHaveBeenCalled()
    expect(mockRedirectToIntendedOrDefault).not.toHaveBeenCalled()
}

async function expectRecoverableError(el: LoginCallback) {
    await waitUntil(() => mockHandleErrorToast.mock.calls.length > 0)
    await el.updateComplete

    expect(el.shadowRoot?.querySelector('wg-loading-state')).toBeNull()

    const errorPage = el.shadowRoot?.querySelector('wg-error-page') as
        | (HTMLElement & {
              title: string
              message: string
              backHref: string
          })
        | null

    expect(errorPage?.title).toBe('Login failed')
    expect(errorPage?.message).toBe(
        'We could not complete your login. Return to network selection and try again.'
    )
    expect(errorPage?.backHref).toBe('/login')
}

describe('LoginCallback', () => {
    let el: LoginCallback
    const componentFixture = html`<login-callback></login-callback>`

    beforeEach(() => {
        mockRedirectToIntendedOrDefault.mockReset()
        mockAddUserSession.mockReset().mockResolvedValue(undefined)
        mockAccessTokenSet.mockReset()
        mockExpirationDateSet.mockReset()
        mockNetworkIdGet.mockReturnValue('net-1')
        mockHandleErrorToast.mockReset()
        sessionStorage.clear()
        setCallbackUrl()
    })

    afterEach(() => {
        // make sure toast is gone from DOM
        document.body.innerHTML = ''
        sessionStorage.clear()
        vi.unstubAllGlobals()
    })

    it('renders the loading state', async () => {
        setCallbackUrl('auth-code', oauthState)
        sessionStorage.setItem('oauth-pkce-state-123', 'pkce-verifier')
        vi.stubGlobal(
            'fetch',
            vi.fn(() => new Promise<Response>(() => {}))
        )

        el = await fixture<LoginCallback>(componentFixture)

        const loadingState = el.shadowRoot?.querySelector(
            'wg-loading-state'
        ) as (HTMLElement & { text?: string }) | null

        expect(loadingState).not.toBeNull()
        expect(loadingState?.text).toBe('Logging in...')
    })

    it('shows a recoverable error when both code and state are missing', async () => {
        el = await fixture<LoginCallback>(componentFixture)

        expectNoAuthSideEffects()
        await expectRecoverableError(el)
    })

    it('shows a recoverable error when only the authorization code is present', async () => {
        setCallbackUrl('auth-code-only')
        el = await fixture<LoginCallback>(componentFixture)

        expectNoAuthSideEffects()
        await expectRecoverableError(el)
    })

    it('shows a recoverable error when only the state parameter is present', async () => {
        setCallbackUrl(undefined, oauthState)
        el = await fixture<LoginCallback>(componentFixture)

        expectNoAuthSideEffects()
        await expectRecoverableError(el)
    })

    it('shows a recoverable error when the PKCE verifier is missing', async () => {
        setCallbackUrl('auth-code', oauthState)
        stubOAuthFetch(tokenWithExpiry())
        el = await fixture<LoginCallback>(componentFixture)

        expectNoAuthSideEffects()
        await expectRecoverableError(el)
    })

    it('shows a recoverable error when the token endpoint returns no access token', async () => {
        setCallbackUrl('auth-code', oauthState)
        sessionStorage.setItem('oauth-pkce-state-123', 'pkce-verifier')
        stubOAuthFetch()

        el = await fixture<LoginCallback>(componentFixture)

        await waitUntil(() =>
            (vi.mocked(fetch) as ReturnType<typeof vi.fn>).mock.calls.some(
                (c) => String(c[0]).includes('https://idp.example/token')
            )
        )

        expectNoAuthSideEffects()
        await expectRecoverableError(el)
    })

    it('uses an empty network id when none is stored in state', async () => {
        mockNetworkIdGet.mockReturnValue('')
        setCallbackUrl('auth-code', oauthState)
        sessionStorage.setItem('oauth-pkce-state-123', 'pkce-verifier')

        const accessToken = tokenWithExpiry()
        stubOAuthFetch(accessToken)

        el = await fixture<LoginCallback>(componentFixture)

        await waitUntil(() => mockAddUserSession.mock.calls.length > 0)

        expect(mockAddUserSession).toHaveBeenCalledWith(accessToken, '')
    })

    it('exchanges the authorization code and stores the access token', async () => {
        setCallbackUrl('auth-code', oauthState)
        sessionStorage.setItem('oauth-pkce-state-123', 'pkce-verifier')

        const accessToken = tokenWithExpiry()
        stubOAuthFetch(accessToken)

        el = await fixture<LoginCallback>(componentFixture)

        await waitUntil(() => mockAccessTokenSet.mock.calls.length > 0)

        expect(mockAccessTokenSet).toHaveBeenCalledWith(
            accessToken,
            expect.any(String)
        )
        expect(mockExpirationDateSet).toHaveBeenCalled()
        expect(mockAddUserSession).toHaveBeenCalledWith(accessToken, 'net-1')
        expect(sessionStorage.getItem('oauth-pkce-state-123')).toBeNull()
        await waitUntil(
            () => mockRedirectToIntendedOrDefault.mock.calls.length > 0
        )
    })

    it('shows a recoverable error when adding the user session fails', async () => {
        const error = new Error('addSession failed')
        mockAddUserSession.mockRejectedValueOnce(error)
        setCallbackUrl('auth-code', oauthState)
        sessionStorage.setItem('oauth-pkce-state-123', 'pkce-verifier')
        stubOAuthFetch(tokenWithExpiry())

        el = await fixture<LoginCallback>(componentFixture)

        await expectRecoverableError(el)
        expect(mockHandleErrorToast).toHaveBeenCalledWith(error)
        expect(mockRedirectToIntendedOrDefault).not.toHaveBeenCalled()
    })
})
