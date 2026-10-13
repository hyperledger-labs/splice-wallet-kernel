// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { waitUntil } from '@open-wc/testing-helpers'
import { LOGIN_PAGE_REDIRECT } from './constants.js'
import {
    attemptRemoveSession,
    createUserClient,
    resetRpcClientCachesForTests,
} from './rpc-client.js'

const {
    mockRemoveSession,
    mockRequest,
    MockUserApiClient,
    HttpTransportSpy,
    mockGetCurrentRoute,
    mockToRelHref,
    mockSetLocationHref,
    mockClearAuthState,
    authState,
} = vi.hoisted(() => {
    const mockRemoveSession = vi.fn()
    const mockRequest = vi.fn()
    const HttpTransportSpy = vi.fn()

    class MockUserApiClient {
        static lastTransport: unknown

        constructor(public transport: unknown) {
            MockUserApiClient.lastTransport = transport
        }

        request = mockRequest
    }

    return {
        mockRemoveSession,
        mockRequest,
        MockUserApiClient,
        HttpTransportSpy,
        mockGetCurrentRoute: vi.fn(() => '/parties'),
        mockToRelHref: vi.fn((path: string) => path),
        mockSetLocationHref: vi.fn(),
        mockClearAuthState: vi.fn(),
        authState: { accessToken: undefined as string | undefined },
    }
})

vi.mock('@canton-network/core-wallet-user-rpc-client', () => ({
    default: MockUserApiClient,
}))
vi.mock('@canton-network/core-rpc-transport', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('@canton-network/core-rpc-transport')
        >()

    class SpiedHttpTransport extends actual.HttpTransport {
        constructor(url: URL, accessToken?: string) {
            super(url, accessToken)
            HttpTransportSpy(url, accessToken)
        }
    }

    return {
        ...actual,
        HttpTransport: SpiedHttpTransport,
    }
})
vi.mock('./navigation.js', () => ({
    setLocationHref: mockSetLocationHref,
}))
vi.mock('./state-manager.js', () => ({
    stateManager: {
        accessToken: {
            get: () => authState.accessToken,
            clear: vi.fn(),
        },
        clearAuthState: mockClearAuthState,
        currentOrigin: { get: vi.fn(), set: vi.fn(), clear: vi.fn() },
    },
}))
vi.mock('@canton-network/core-wallet-ui-components', () => ({
    getCurrentRoute: mockGetCurrentRoute,
    toRelHref: mockToRelHref,
    toRelPath: (path: string) => path,
}))

describe('rpc-client', () => {
    let consoleWarn: ReturnType<typeof vi.spyOn>
    let consoleDebug: ReturnType<typeof vi.spyOn>
    let fetchMock: ReturnType<typeof vi.fn>
    let originalFetch: typeof fetch

    beforeEach(() => {
        resetRpcClientCachesForTests()
        MockUserApiClient.lastTransport = undefined
        mockRemoveSession.mockReset()
        mockRequest.mockReset()
        HttpTransportSpy.mockClear()
        mockClearAuthState.mockClear()
        mockSetLocationHref.mockClear()
        mockGetCurrentRoute.mockReturnValue('/parties')
        mockToRelHref.mockImplementation((path: string) => path)
        authState.accessToken = undefined
        originalFetch = globalThis.fetch.bind(globalThis)
        fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
        consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        consoleDebug = vi.spyOn(console, 'debug').mockImplementation(() => {})
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'removeSession') {
                return mockRemoveSession()
            }
            return undefined
        })
        mockRemoveSession.mockResolvedValue(undefined)
    })

    afterEach(() => {
        vi.stubGlobal('fetch', originalFetch)
        consoleWarn?.mockRestore()
        consoleDebug?.mockRestore()
    })

    it('createUserClient uses userPath from gateway config', async () => {
        const customUserPath = `${window.location.origin}/api/v0/custom-user`
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ userApiUrl: customUserPath }), {
                status: 200,
            })
        )

        await createUserClient('test-token')

        expect(fetchMock).toHaveBeenCalledWith(
            '/.well-known/wallet-gateway-config'
        )
        expect(HttpTransportSpy).toHaveBeenCalledWith(
            new URL(customUserPath),
            'test-token'
        )
    })

    it('createUserClient falls back to the default user path when config fetch fails', async () => {
        fetchMock.mockRejectedValue(new Error('network error'))

        await createUserClient()

        expect(consoleWarn).toHaveBeenCalled()
        expect(HttpTransportSpy).toHaveBeenCalledWith(
            new URL('/api/v0/user', window.location.origin),
            undefined
        )
    })

    it('attemptRemoveSession calls removeSession on the user API', async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({}), { status: 200 })
        )

        await attemptRemoveSession('logout-token')

        expect(mockRequest).toHaveBeenCalledWith({ method: 'removeSession' })
        expect(HttpTransportSpy).toHaveBeenCalledWith(
            expect.any(URL),
            'logout-token'
        )
    })

    describe('401 auto logout', () => {
        async function trigger401OnAuthTransport() {
            fetchMock.mockResolvedValue(
                new Response(JSON.stringify({}), { status: 200 })
            )
            await createUserClient('session-token')
            const transport = MockUserApiClient.lastTransport as {
                handleErrorResponse: (response: Response) => Promise<never>
            }
            return transport.handleErrorResponse(
                new Response('Unauthorized', {
                    status: 401,
                    statusText: 'Unauthorized',
                })
            )
        }

        it('clears auth state, removes session, and redirects to login', async () => {
            authState.accessToken = 'stale-token'
            mockGetCurrentRoute.mockReturnValue('/parties')

            await expect(trigger401OnAuthTransport()).rejects.toMatchObject({
                code: 4100,
            })

            await waitUntil(() => mockClearAuthState.mock.calls.length > 0)

            expect(mockRequest).toHaveBeenCalledWith({
                method: 'removeSession',
            })
            expect(mockClearAuthState).toHaveBeenCalled()
            expect(mockGetCurrentRoute).toHaveBeenCalledWith(
                window.location.pathname
            )
            expect(mockToRelHref).toHaveBeenCalledWith(LOGIN_PAGE_REDIRECT)
            expect(mockSetLocationHref).toHaveBeenCalledWith(
                LOGIN_PAGE_REDIRECT
            )
        })

        it('does not redirect when already on the login page', async () => {
            authState.accessToken = 'stale-token'
            mockGetCurrentRoute.mockReturnValue(LOGIN_PAGE_REDIRECT)

            await expect(trigger401OnAuthTransport()).rejects.toBeDefined()

            await waitUntil(() => mockClearAuthState.mock.calls.length > 0)

            expect(mockClearAuthState).toHaveBeenCalled()
            expect(mockSetLocationHref).not.toHaveBeenCalled()
        })

        it('skips removeSession when there is no access token', async () => {
            authState.accessToken = undefined
            mockGetCurrentRoute.mockReturnValue('/parties')

            await expect(trigger401OnAuthTransport()).rejects.toBeDefined()

            await waitUntil(() => mockClearAuthState.mock.calls.length > 0)

            expect(mockRequest).not.toHaveBeenCalledWith({
                method: 'removeSession',
            })
            expect(mockClearAuthState).toHaveBeenCalled()
            expect(mockToRelHref).toHaveBeenCalledWith(LOGIN_PAGE_REDIRECT)
            expect(mockSetLocationHref).toHaveBeenCalledWith(
                LOGIN_PAGE_REDIRECT
            )
        })
    })
})
