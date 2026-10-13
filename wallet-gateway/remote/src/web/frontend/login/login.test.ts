// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixture, waitUntil } from '@open-wc/testing-helpers'
import { html } from 'lit'
import {
    LoginConnectEvent,
    type WgLoginForm,
} from '@canton-network/core-wallet-ui-components'
import {
    createMockUserClient,
    makeIdp,
    makePublicNetwork,
    mockRequest,
} from '../test-helpers.js'

const {
    mockCreateUserClient,
    handleErrorToast,
    mockRedirectToIntendedOrDefault,
    mockAddUserSession,
    mockGetAccessToken,
    mockAccessTokenSet,
    mockExpirationDateSet,
    mockNetworkIdSet,
    mockNetworkIdGet,
    mockOnboardingSessionIdSet,
    setLocationHref,
} = vi.hoisted(() => ({
    mockCreateUserClient: vi.fn(),
    handleErrorToast: vi.fn(),
    mockRedirectToIntendedOrDefault: vi.fn(),
    mockAddUserSession: vi.fn().mockResolvedValue(undefined),
    mockGetAccessToken: vi.fn(),
    mockAccessTokenSet: vi.fn(),
    mockExpirationDateSet: vi.fn(),
    mockNetworkIdSet: vi.fn(),
    mockNetworkIdGet: vi.fn(() => 'net-1'),
    mockOnboardingSessionIdSet: vi.fn(),
    setLocationHref: vi.fn(),
}))

const defaultAccessToken =
    'eyJ0eXAiOiJKV1QiLCJraWQiOiJrZXlJZCIsImFsZyI6IlJTMjU2In0=.' +
    btoa(
        JSON.stringify({
            exp: Math.floor(Date.now() / 1000) + 3600,
        })
    ) +
    '.signature'

vi.mock('../index.js', () => ({
    redirectToIntendedOrDefault: mockRedirectToIntendedOrDefault,
    addUserSession: mockAddUserSession,
}))
vi.mock('../navigation.js', () => ({ setLocationHref }))
vi.mock('../rpc-client.js', () => ({
    createUserClient: mockCreateUserClient,
}))
vi.mock('../state-manager.js', () => ({
    stateManager: {
        accessToken: {
            get: () => undefined,
            set: mockAccessTokenSet,
        },
        expirationDate: { set: mockExpirationDateSet },
        networkId: { set: mockNetworkIdSet, get: mockNetworkIdGet },
        onboardingSessionId: { set: mockOnboardingSessionIdSet },
        currentOrigin: { get: vi.fn(), set: vi.fn(), clear: vi.fn() },
    },
}))
vi.mock('@canton-network/core-wallet-auth', () => ({
    AuthTokenProvider: vi.fn().mockImplementation(function AuthTokenProvider() {
        return {
            getAccessToken: mockGetAccessToken,
        }
    }),
    ClientCredentials: {},
}))
vi.mock('@canton-network/core-wallet-ui-components', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('@canton-network/core-wallet-ui-components')
        >()
    return { ...actual, handleErrorToast }
})

import './login.js'
import type { LoginUI } from './login.js'

const selfSignedNetwork = makePublicNetwork({
    id: 'net-1',
    name: 'Self Signed Network',
    authMethod: 'client_credentials',
})
const selfSignedIdp = makeIdp({ id: 'idp-1', type: 'self_signed' })

const oauthConfigUrl = 'https://idp.example/.well-known/openid-configuration'
const oauthNetwork = makePublicNetwork({
    id: 'net-oauth',
    name: 'OAuth Network',
    authMethod: 'authorization_code',
    audience: 'audience',
    scope: 'openid profile',
    clientId: 'oauth-client-id',
})
const oauthIdp = makeIdp({
    id: 'idp-oauth',
    type: 'oauth',
    configUrl: oauthConfigUrl,
})

function dispatchConnect(
    el: LoginUI,
    network = selfSignedNetwork,
    idp = selfSignedIdp,
    clientId = 'client-id',
    clientSecret = 'client-secret',
    username?: string
) {
    el.shadowRoot
        ?.querySelector('wg-login-form')
        ?.dispatchEvent(
            new LoginConnectEvent(
                network,
                idp,
                clientId,
                clientSecret,
                username
            )
        )
}

function getLoginForm(el: LoginUI): WgLoginForm | null {
    return el.shadowRoot?.querySelector('wg-login-form') ?? null
}

function stubOAuthConfigFetch(
    authorizationEndpoint = 'https://idp.example/authorize'
) {
    vi.stubGlobal(
        'fetch',
        vi.fn(async (input: string | URL) => {
            const url = new URL(input).href
            if (url === oauthConfigUrl) {
                return new Response(
                    JSON.stringify({
                        authorization_endpoint: authorizationEndpoint,
                    }),
                    { status: 200 }
                )
            }
            return new Response('{}', { status: 404 })
        })
    )
}

describe('LoginUI', () => {
    let el: LoginUI
    const componentFixture = html`<user-ui-login></user-ui-login>`

    beforeEach(async () => {
        mockCreateUserClient.mockReset()
        mockRequest.mockReset()
        handleErrorToast.mockReset()
        mockRedirectToIntendedOrDefault.mockReset()
        mockAddUserSession.mockClear()
        mockGetAccessToken.mockReset()
        mockAccessTokenSet.mockReset()
        mockExpirationDateSet.mockReset()
        mockNetworkIdSet.mockReset()
        mockNetworkIdGet.mockReset()
        mockNetworkIdGet.mockReturnValue('net-1')
        mockOnboardingSessionIdSet.mockReset()
        setLocationHref.mockReset()
        mockGetAccessToken.mockResolvedValue(defaultAccessToken)
        mockCreateUserClient.mockResolvedValue(createMockUserClient())
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'listNetworks') {
                return { networks: [selfSignedNetwork] }
            }
            if (method === 'listIdps') {
                return { idps: [selfSignedIdp] }
            }
            if (method === 'selfSignedAccessToken') {
                return { accessToken: defaultAccessToken }
            }
            if (method === 'addSelfIssuedSession') {
                return { sessionId: 'onboarding-session-1' }
            }
            return undefined
        })
        el = await fixture<LoginUI>(componentFixture)
    })

    afterEach(() => {
        // make sure toast is gone from DOM
        document.body.innerHTML = ''
        sessionStorage.clear()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
        vi.useRealTimers()
    })

    it('renders the login form with loaded networks and idps', async () => {
        await waitUntil(() => el.networks.length === 1)

        expect(el.shadowRoot?.querySelector('wg-login-form')).not.toBeNull()
        expect(el.idps).toHaveLength(1)
    })

    it('redirects after self-signed connect succeeds', async () => {
        await waitUntil(() => el.networks.length === 1)

        dispatchConnect(el)

        await waitUntil(
            () => mockRedirectToIntendedOrDefault.mock.calls.length > 0
        )

        expect(mockNetworkIdSet).toHaveBeenCalledWith(
            'net-1',
            expect.any(String)
        )
        expect(mockAccessTokenSet).toHaveBeenCalledWith(
            defaultAccessToken,
            expect.any(String)
        )
        expect(mockExpirationDateSet).toHaveBeenCalled()
        expect(mockAddUserSession).toHaveBeenCalledWith(
            defaultAccessToken,
            'net-1'
        )
        expect(mockRedirectToIntendedOrDefault).toHaveBeenCalled()
    })

    it('creates a tokenless session before self-issued onboarding', async () => {
        await waitUntil(() => el.networks.length === 1)
        const network = makePublicNetwork({
            id: 'self-issued-network',
            authMethod: 'self_issued',
        })

        dispatchConnect(
            el,
            network,
            selfSignedIdp,
            undefined,
            undefined,
            'alice'
        )

        await waitUntil(() => setLocationHref.mock.calls.length > 0)
        expect(mockRequest).toHaveBeenCalledWith({
            method: 'addSelfIssuedSession',
            params: {
                username: 'alice',
                networkId: 'self-issued-network',
                origin: window.location.origin,
            },
        })
        expect(mockOnboardingSessionIdSet).toHaveBeenCalledWith(
            'onboarding-session-1',
            window.location.origin
        )
        const redirectUrl = new URL(setLocationHref.mock.calls[0]![0])
        expect(redirectUrl.pathname).toBe('/onboarding/')
        expect(redirectUrl.search).toBe('')
    })

    it('sends the client secret from the login form', async () => {
        await waitUntil(() => el.networks.length === 1)

        dispatchConnect(
            el,
            selfSignedNetwork,
            selfSignedIdp,
            'client-id',
            'network-secret'
        )

        await waitUntil(
            () => mockRedirectToIntendedOrDefault.mock.calls.length > 0
        )

        expect(mockRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'selfSignedAccessToken',
                params: {
                    networkId: 'net-1',
                    clientId: 'client-id',
                    clientSecret: 'network-secret',
                },
            })
        )
        expect(mockRedirectToIntendedOrDefault).toHaveBeenCalled()
    })

    it('shows loading state while connecting', async () => {
        await waitUntil(() => el.networks.length === 1)

        let resolveToken!: (value: string) => void
        mockGetAccessToken.mockReturnValue(
            new Promise((resolve) => {
                resolveToken = resolve
            })
        )

        dispatchConnect(el)

        await waitUntil(() => el.connecting)
        expect(el.shadowRoot?.querySelector('wg-loading-state')).not.toBeNull()
        expect(el.connectingMessage).toBe(
            'Connecting to Self Signed Network...'
        )

        resolveToken(defaultAccessToken)
        await waitUntil(
            () => mockRedirectToIntendedOrDefault.mock.calls.length > 0
        )
    })

    it('calls handleErrorToast when loading networks fails', async () => {
        mockRequest.mockRejectedValue(new Error('list failed'))
        el = await fixture<LoginUI>(componentFixture)

        await waitUntil(() => handleErrorToast.mock.calls.length > 0)

        expect(handleErrorToast).toHaveBeenCalled()
    })

    it('calls handleErrorToast when loading idps fails', async () => {
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'listNetworks') {
                return { networks: [selfSignedNetwork] }
            }
            if (method === 'listIdps') {
                throw new Error('idp list failed')
            }
            return undefined
        })
        el = await fixture<LoginUI>(componentFixture)

        await waitUntil(() => handleErrorToast.mock.calls.length > 0)

        expect(handleErrorToast).toHaveBeenCalled()
    })

    it('shows a form error when connect fails', async () => {
        await waitUntil(() => el.networks.length === 1)
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'listNetworks') {
                return { networks: [selfSignedNetwork] }
            }
            if (method === 'listIdps') {
                return { idps: [selfSignedIdp] }
            }
            if (method === 'selfSignedAccessToken') {
                throw new Error('auth failed')
            }
            return undefined
        })

        dispatchConnect(el)

        await waitUntil(() => handleErrorToast.mock.calls.length > 0)
        await waitUntil(() => !el.connecting)

        expect(handleErrorToast).toHaveBeenCalled()
        expect(getLoginForm(el)?.message).toBe(
            'Unable to connect. Please try again.'
        )
        expect(getLoginForm(el)?.messageType).toBe('error')
        expect(mockRedirectToIntendedOrDefault).not.toHaveBeenCalled()
    })

    it('shows an error for unsupported identity provider types', async () => {
        await waitUntil(() => el.networks.length === 1)

        dispatchConnect(
            el,
            selfSignedNetwork,
            makeIdp({ id: 'idp-1', type: 'saml' })
        )

        await waitUntil(() => !el.connecting)

        expect(getLoginForm(el)?.message).toBe(
            'This authentication type is not supported yet.'
        )
        expect(getLoginForm(el)?.messageType).toBe('error')
        expect(mockRedirectToIntendedOrDefault).not.toHaveBeenCalled()
    })

    it('shows an error for oauth networks without authorization_code', async () => {
        await waitUntil(() => el.networks.length === 1)

        dispatchConnect(el, selfSignedNetwork, oauthIdp)

        await waitUntil(() => !el.connecting)

        expect(getLoginForm(el)?.message).toBe(
            'This authentication method is not valid.'
        )
        expect(getLoginForm(el)?.messageType).toBe('error')
        expect(mockRedirectToIntendedOrDefault).not.toHaveBeenCalled()
    })

    it('starts oauth authorization_code flow and redirects to the IdP', async () => {
        await waitUntil(() => el.networks.length === 1)

        vi.useFakeTimers({ shouldAdvanceTime: true })
        stubOAuthConfigFetch()

        dispatchConnect(el, oauthNetwork, oauthIdp, 'oauth-client-id')

        await waitUntil(() => el.connectingMessage.includes('Redirecting to'))

        expect(el.shadowRoot?.querySelector('wg-loading-state')).not.toBeNull()
        expect(el.connectingMessage).toBe('Redirecting to OAuth Network...')
        expect(mockNetworkIdSet).toHaveBeenCalledWith(
            'net-oauth',
            expect.any(String)
        )
        expect(vi.mocked(fetch)).toHaveBeenCalledWith(oauthConfigUrl)

        const storedKeys = Object.keys(sessionStorage).filter((key) =>
            key.startsWith('oauth-pkce-')
        )
        expect(storedKeys).toHaveLength(1)
        expect(sessionStorage.getItem(storedKeys[0]!)).toBeTruthy()

        vi.advanceTimersByTime(250)

        expect(setLocationHref).toHaveBeenCalledOnce()
        const redirectUrl = setLocationHref.mock.calls[0]![0] as string
        expect(redirectUrl).toContain('https://idp.example/authorize')
        expect(redirectUrl).toContain('response_type=code')
        expect(redirectUrl).toContain('client_id=oauth-client-id')
        expect(redirectUrl).toContain('code_challenge_method=S256')
        expect(mockRedirectToIntendedOrDefault).not.toHaveBeenCalled()
    })
})
