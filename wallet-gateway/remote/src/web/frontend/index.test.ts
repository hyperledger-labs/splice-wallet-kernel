// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixture, waitUntil } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { WalletEvent } from '@canton-network/core-types'
import {
    CopyDappApiUrlEvent,
    LogoutEvent,
    type AllowedRoute,
} from '@canton-network/core-wallet-ui-components'
import {
    DEFAULT_PAGE_REDIRECT,
    LOGIN_PAGE_REDIRECT,
    NOT_FOUND_PAGE_REDIRECT,
    TOKEN_EXPIRATION_TIMEOUT_LIMIT_MS,
} from './constants.js'
import { createMockUserClient, mockRequest } from './test-helpers.js'

const authState = vi.hoisted(() => ({
    accessToken: undefined as string | undefined,
    networkId: undefined as string | undefined,
    expirationDate: undefined as string | undefined,
    intendedPage: undefined as string | undefined,
}))

const {
    mockCreateUserClient,
    mockAttemptRemoveSession,
    setLocationHref,
    getCurrentRoute,
    isAllowedRoute,
    showToast,
    fetchDappApiUrl,
} = vi.hoisted(() => ({
    mockCreateUserClient: vi.fn(),
    mockAttemptRemoveSession: vi.fn().mockResolvedValue(undefined),
    setLocationHref: vi.fn(),
    getCurrentRoute: vi.fn(),
    isAllowedRoute: vi.fn(),
    showToast: vi.fn(),
    fetchDappApiUrl: vi
        .fn()
        .mockResolvedValue('http://localhost:3030/api/v0/dapp'),
}))

vi.mock('@canton-network/core-wallet-ui-components', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('@canton-network/core-wallet-ui-components')
        >()
    getCurrentRoute.mockImplementation(actual.getCurrentRoute)
    isAllowedRoute.mockImplementation(actual.isAllowedRoute)
    return {
        ...actual,
        getCurrentRoute,
        isAllowedRoute,
    }
})

vi.mock('./navigation.js', () => ({ setLocationHref }))
vi.mock('./rpc-client.js', () => ({
    createUserClient: mockCreateUserClient,
    attemptRemoveSession: mockAttemptRemoveSession,
}))
vi.mock('./utils.js', () => ({ showToast, fetchDappApiUrl }))
vi.mock('./state-manager.js', () => ({
    stateManager: {
        accessToken: {
            get: async () => await Promise.resolve(authState.accessToken),
            set: async (value: string) => {
                authState.accessToken = await Promise.resolve(value)
            },
            clear: async () => {
                authState.accessToken = await Promise.resolve(undefined)
            },
        },
        networkId: {
            get: () => authState.networkId,
            set: (value: string) => {
                authState.networkId = value
            },
            clear: () => {
                authState.networkId = undefined
            },
        },
        expirationDate: {
            get: () => authState.expirationDate,
            set: (value: string) => {
                authState.expirationDate = value
            },
            clear: () => {
                authState.expirationDate = undefined
            },
        },
        intendedPage: {
            get: () => authState.intendedPage,
            set: (value: string) => {
                authState.intendedPage = value
            },
            clear: () => {
                authState.intendedPage = undefined
            },
        },
        clearAuthState: () => {
            authState.accessToken = undefined
            authState.networkId = undefined
            authState.expirationDate = undefined
            authState.intendedPage = undefined
        },
        currentOrigin: {
            get: vi.fn().mockReturnValue('http://localhost'),
            set: vi.fn(),
            clear: vi.fn(),
        },
        sessionId: { get: vi.fn(), set: vi.fn(), clear: vi.fn() },
    },
}))

import '@canton-network/core-wallet-ui-components'
import {
    type UserApp,
    type UserUI,
    type UserUIAuthRedirect,
    addUserSession,
    redirectToIntendedOrDefault,
    shareConnection,
} from './index.js'

function setPath(pathname: string) {
    history.replaceState({}, '', pathname)
}

function setValidAuth(expiresInMs = 60 * 60 * 1000) {
    authState.accessToken = 'access-token'
    authState.networkId = 'network1'
    authState.expirationDate = new Date(Date.now() + expiresInMs).toISOString()
}

function mockSessionList(
    sessionId = 'session-1',
    status: 'connected' | 'disconnected' = 'connected'
) {
    mockRequest.mockImplementation(async ({ method }) => {
        if (method === 'listSessions') {
            return {
                sessions: sessionId
                    ? [
                          {
                              id: sessionId,
                              network: { id: 'network1' },
                              status,
                          },
                      ]
                    : [],
            }
        }
        if (method === 'removeSession') {
            return undefined
        }
        if (method === 'addSession') {
            return { id: 'new-session' }
        }
        return undefined
    })
}

describe('redirectToIntendedOrDefault', () => {
    beforeEach(() => {
        setLocationHref.mockReset()
        authState.intendedPage = undefined
    })

    it('redirects to the intended page when set', async () => {
        authState.intendedPage = '/activities'
        await redirectToIntendedOrDefault()
        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/activities')
        )
        expect(authState.intendedPage).toBeUndefined()
    })

    it('redirects to the default page when no intended page is stored', async () => {
        await redirectToIntendedOrDefault()
        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining(DEFAULT_PAGE_REDIRECT)
        )
    })
})

describe('shareConnection', () => {
    const postMessage = vi.fn()

    beforeEach(() => {
        postMessage.mockReset()
        vi.stubGlobal('opener', { closed: false, postMessage })
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('posts auth success to the opener window', () => {
        shareConnection('token-abc', 'session-xyz')

        expect(postMessage).toHaveBeenCalledWith(
            {
                type: WalletEvent.SPLICE_WALLET_IDP_AUTH_SUCCESS,
                token: 'token-abc',
                sessionId: 'session-xyz',
            },
            '*'
        )
    })

    it('does nothing when there is no opener', () => {
        vi.stubGlobal('opener', null)
        shareConnection('token-abc', 'session-xyz')
        expect(postMessage).not.toHaveBeenCalled()
    })
})

describe('addUserSession', () => {
    beforeEach(() => {
        mockCreateUserClient.mockReset()
        mockRequest.mockReset()
        mockCreateUserClient.mockResolvedValue(createMockUserClient())
        vi.stubGlobal('opener', { closed: false, postMessage: vi.fn() })
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('creates a session and shares the connection with the opener', async () => {
        mockRequest.mockImplementation(async ({ method, params }) => {
            if (method === 'addSession') {
                expect(params).toMatchObject({ networkId: 'network1' })
                return { id: 'session-new' }
            }
            return undefined
        })

        await addUserSession('token-abc', 'network1')

        expect(mockRequest).toHaveBeenCalledWith(
            expect.objectContaining({ method: 'addSession' })
        )
    })
})

describe('UserApp', () => {
    let el: UserApp
    const componentFixture = html`<user-app></user-app>`

    beforeEach(async () => {
        mockCreateUserClient.mockReset()
        mockRequest.mockReset()
        setLocationHref.mockReset()
        showToast.mockReset()
        fetchDappApiUrl.mockReset()
        fetchDappApiUrl.mockResolvedValue('http://localhost:3030/api/v0/dapp')
        mockCreateUserClient.mockResolvedValue(createMockUserClient())
        setValidAuth()
        mockSessionList()
        setPath('/parties')
        vi.stubGlobal('opener', null)
        el = await fixture<UserApp>(componentFixture)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        // make sure toast is gone from DOM
        document.body.innerHTML = ''
    })

    it('renders layout with the connected network name', async () => {
        await waitUntil(() => {
            const layout = el.shadowRoot?.querySelector(
                'app-layout'
            ) as HTMLElement & { networkConnected: boolean }
            return layout?.networkConnected === true
        })

        const layout = el.shadowRoot?.querySelector(
            'app-layout'
        ) as HTMLElement & {
            networkName: string
            networkConnected: boolean
            dappApiUrl: string
        }
        expect(layout.networkName).toBe('network1')
        expect(layout.networkConnected).toBe(true)
        expect(layout.dappApiUrl).toBe('http://localhost:3030/api/v0/dapp')
    })

    it('copies the dApp API URL to the clipboard', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined)
        vi.stubGlobal('navigator', {
            ...navigator,
            clipboard: { writeText },
        })

        el.shadowRoot
            ?.querySelector('app-layout')
            ?.dispatchEvent(new CopyDappApiUrlEvent())

        await waitUntil(() => writeText.mock.calls.length > 0)

        expect(fetchDappApiUrl).toHaveBeenCalled()
        expect(writeText).toHaveBeenCalledWith(
            'http://localhost:3030/api/v0/dapp'
        )
        expect(showToast).toHaveBeenCalledWith(
            'Copied',
            'Dapp API URL copied to clipboard.',
            'success'
        )
    })

    it('shows disconnected when listSessions reports disconnected', async () => {
        mockSessionList('session-1', 'disconnected')
        el = await fixture<UserApp>(componentFixture)

        await waitUntil(() =>
            mockRequest.mock.calls.some(
                (call) => call[0]?.method === 'listSessions'
            )
        )
        await el.updateComplete

        const layout = el.shadowRoot?.querySelector(
            'app-layout'
        ) as HTMLElement & {
            networkName: string
            networkConnected: boolean
            dappApiUrl: string
        }
        expect(layout.networkName).toBe('network1')
        expect(layout.networkConnected).toBe(false)
    })

    it('keeps the page hidden until the session behind it is verified', async () => {
        let resolveSessions
        const pendingSessions = new Promise<{ sessions: unknown[] }>(
            (resolve) => {
                resolveSessions = resolve
            }
        )
        mockRequest.mockImplementation(async ({ method }) =>
            method === 'listSessions' ? pendingSessions : undefined
        )

        el = await fixture<UserApp>(componentFixture)

        expect(el.shadowRoot?.querySelector('slot')).toBeNull()
        expect(el.shadowRoot?.querySelector('.loading')?.textContent).toContain(
            'Loading...'
        )

        resolveSessions!({
            sessions: [{ id: 'session-1', network: { id: 'network1' } }],
        })

        await waitUntil(() => el.shadowRoot?.querySelector('slot') !== null)
        expect(el.shadowRoot?.querySelector('.loading')).toBeNull()
    })

    it('redirects to login on logout when there is no access token', async () => {
        authState.accessToken = undefined
        el = await fixture<UserApp>(componentFixture)

        const header = el.shadowRoot
            ?.querySelector('app-layout')
            ?.shadowRoot?.querySelector('app-header')
        header?.dispatchEvent(new LogoutEvent())

        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining(LOGIN_PAGE_REDIRECT)
        )
    })

    it('clears auth state and redirects to login after logout', async () => {
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'listSessions') {
                return {
                    sessions: [
                        { id: 'session-1', network: { id: 'network1' } },
                    ],
                }
            }
            if (method === 'removeSession') {
                return undefined
            }
            return undefined
        })
        el = await fixture<UserApp>(componentFixture)
        setLocationHref.mockClear()

        el.shadowRoot
            ?.querySelector('app-layout')
            ?.dispatchEvent(new LogoutEvent())

        await waitUntil(() =>
            mockRequest.mock.calls.some(
                (call) => call[0]?.method === 'removeSession'
            )
        )

        expect(mockRequest).toHaveBeenCalledWith(
            expect.objectContaining({ method: 'removeSession' })
        )
        expect(authState.accessToken).toBeUndefined()
        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining(LOGIN_PAGE_REDIRECT)
        )
    })
})

describe('UserUI', () => {
    beforeEach(() => {
        setLocationHref.mockReset()
    })

    afterEach(() => {
        // make sure toast is gone from DOM
        document.body.innerHTML = ''
    })

    it('redirects to the not-found page for disallowed routes', async () => {
        getCurrentRoute.mockReturnValue('/parties' as AllowedRoute)
        isAllowedRoute.mockReturnValue(false)
        setPath('/parties')

        await fixture<UserUI>(html`<user-ui></user-ui>`)

        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining(NOT_FOUND_PAGE_REDIRECT)
        )
    })
})

describe('UserUIAuthRedirect', () => {
    beforeEach(async () => {
        const actual = await vi.importActual<
            typeof import('@canton-network/core-wallet-ui-components')
        >('@canton-network/core-wallet-ui-components')
        getCurrentRoute.mockImplementation(actual.getCurrentRoute)
        isAllowedRoute.mockImplementation(actual.isAllowedRoute)

        mockCreateUserClient.mockReset()
        mockRequest.mockReset()
        mockAttemptRemoveSession.mockClear()
        setLocationHref.mockReset()
        mockCreateUserClient.mockResolvedValue(createMockUserClient())
        authState.intendedPage = undefined
        vi.stubGlobal('opener', null)
    })

    afterEach(() => {
        // make sure toast is gone from DOM
        document.body.innerHTML = ''
        vi.unstubAllGlobals()
        vi.useRealTimers()
    })

    it('redirects unauthenticated users on protected pages to login', async () => {
        authState.accessToken = undefined
        setPath('/parties')

        await fixture<UserUIAuthRedirect>(
            html`<user-ui-auth-redirect></user-ui-auth-redirect>`
        )

        expect(authState.intendedPage).toBe('/parties')
        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining(LOGIN_PAGE_REDIRECT)
        )
    })

    it('does not redirect unauthenticated users already on the login page', async () => {
        authState.accessToken = undefined
        setPath('/login')

        await fixture<UserUIAuthRedirect>(
            html`<user-ui-auth-redirect></user-ui-auth-redirect>`
        )

        expect(setLocationHref).not.toHaveBeenCalled()
    })

    it('redirects authenticated users on the login page when a session exists', async () => {
        setValidAuth()
        mockSessionList()
        setPath('/login')

        await fixture<UserUIAuthRedirect>(
            html`<user-ui-auth-redirect></user-ui-auth-redirect>`
        )

        await waitUntil(() => setLocationHref.mock.calls.length > 0)

        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining(DEFAULT_PAGE_REDIRECT)
        )
    })

    it('clears auth when login page has a token but no session', async () => {
        setValidAuth()
        mockSessionList('')
        setPath('/login')

        await fixture<UserUIAuthRedirect>(
            html`<user-ui-auth-redirect></user-ui-auth-redirect>`
        )
        await waitUntil(() => mockAttemptRemoveSession.mock.calls.length > 0)

        expect(mockAttemptRemoveSession).toHaveBeenCalled()
        expect(authState.accessToken).toBeUndefined()
        expect(setLocationHref).not.toHaveBeenCalled()
    })

    it('redirects expired tokens on protected pages to login', async () => {
        authState.accessToken = 'expired-token'
        authState.expirationDate = new Date(Date.now() - 60_000).toISOString()
        setPath('/parties')

        await fixture<UserUIAuthRedirect>(
            html`<user-ui-auth-redirect></user-ui-auth-redirect>`
        )
        await waitUntil(() => setLocationHref.mock.calls.length > 0)

        expect(mockAttemptRemoveSession).toHaveBeenCalled()
        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining(LOGIN_PAGE_REDIRECT)
        )
    })

    it('chains bounded timeouts until a long-lived token expires', async () => {
        const moreThan32Bits = 30 * 24 * 60 * 60 * 1000
        vi.useFakeTimers({ shouldAdvanceTime: true })
        const now = new Date('2026-01-01T00:00:00Z')
        vi.setSystemTime(now)
        setValidAuth(moreThan32Bits)
        mockSessionList()
        setPath('/parties')

        const authSettled = new Promise<Event>((resolve) => {
            document.addEventListener('auth-settled', resolve, { once: true })
        })
        await fixture<UserUIAuthRedirect>(
            html`<user-ui-auth-redirect></user-ui-auth-redirect>`
        )
        await authSettled

        expect(mockAttemptRemoveSession).not.toHaveBeenCalled()
        expect(setLocationHref).not.toHaveBeenCalled()

        vi.setSystemTime(
            new Date(now.getTime() + TOKEN_EXPIRATION_TIMEOUT_LIMIT_MS)
        )
        await vi.runOnlyPendingTimersAsync()

        expect(mockAttemptRemoveSession).not.toHaveBeenCalled()
        expect(setLocationHref).not.toHaveBeenCalled()

        vi.setSystemTime(new Date(now.getTime() + moreThan32Bits))
        await vi.runOnlyPendingTimersAsync()

        expect(mockAttemptRemoveSession).toHaveBeenCalledOnce()
        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining(LOGIN_PAGE_REDIRECT)
        )
    })

    it('logs out when a delayed timeout runs after expiration', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        const now = new Date('2026-01-01T00:00:00Z')
        vi.setSystemTime(now)
        setValidAuth(2 * TOKEN_EXPIRATION_TIMEOUT_LIMIT_MS)
        mockSessionList()
        setPath('/parties')

        const authSettled = new Promise<Event>((resolve) => {
            document.addEventListener('auth-settled', resolve, { once: true })
        })
        await fixture<UserUIAuthRedirect>(
            html`<user-ui-auth-redirect></user-ui-auth-redirect>`
        )
        await authSettled

        vi.setSystemTime(
            new Date(now.getTime() + 3 * TOKEN_EXPIRATION_TIMEOUT_LIMIT_MS)
        )
        await vi.runOnlyPendingTimersAsync()

        expect(mockAttemptRemoveSession).toHaveBeenCalledOnce()
        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining(LOGIN_PAGE_REDIRECT)
        )
    })

    it('redirects authenticated users on root to the default page', async () => {
        setValidAuth()
        mockSessionList()
        setPath('/')

        await fixture<UserUIAuthRedirect>(
            html`<user-ui-auth-redirect></user-ui-auth-redirect>`
        )

        await waitUntil(() => setLocationHref.mock.calls.length > 0)
        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining(DEFAULT_PAGE_REDIRECT)
        )
    })
})
