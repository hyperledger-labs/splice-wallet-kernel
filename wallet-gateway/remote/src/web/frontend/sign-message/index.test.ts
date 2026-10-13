// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixture, waitUntil } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { JsonRpcError } from '@canton-network/core-rpc-errors'
import { createMockUserClient, mockRequest } from '../test-helpers.js'

const { mockCreateUserClient, handleErrorToast, setLocationHref } = vi.hoisted(
    () => ({
        mockCreateUserClient: vi.fn(),
        handleErrorToast: vi.fn(),
        setLocationHref: vi.fn(),
    })
)

vi.mock('../index.js', () => ({}))
vi.mock('../navigation.js', () => ({ setLocationHref }))
vi.mock('../rpc-client.js', () => ({
    createUserClient: mockCreateUserClient,
}))
vi.mock('../state-manager.js', () => ({
    stateManager: {
        accessToken: { get: () => 'test-token' },
        currentOrigin: {
            get: vi.fn().mockReturnValue('http://localhost'),
            set: vi.fn(),
            clear: vi.fn(),
        },
    },
}))
vi.mock('@canton-network/core-wallet-ui-components', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('@canton-network/core-wallet-ui-components')
        >()
    return { ...actual, handleErrorToast }
})

import './index.js'
import type { UserUiSignMessage } from './index.js'

function makeRpcTransportError(rpcMessage: string) {
    return new JsonRpcError(
        -32600,
        'Bad Request',
        JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32600, message: rpcMessage },
            id: null,
        })
    )
}

describe('UserUiSignMessage', () => {
    let el: UserUiSignMessage
    const componentFixture = html`<user-ui-sign-message></user-ui-sign-message>`

    beforeEach(() => {
        mockCreateUserClient.mockReset()
        mockRequest.mockReset()
        handleErrorToast.mockReset()
        setLocationHref.mockReset()
        mockCreateUserClient.mockResolvedValue(createMockUserClient())
        vi.stubGlobal(
            'confirm',
            vi.fn(() => true)
        )
    })

    afterEach(() => {
        // make sure toast is gone from DOM
        document.body.innerHTML = ''
        vi.unstubAllGlobals()
    })

    it('shows an error when messageId is missing from the URL', async () => {
        history.replaceState({}, '', '/sign-message')

        el = await fixture<UserUiSignMessage>(componentFixture)

        await waitUntil(() => el.loadError !== null)

        expect(el.shadowRoot?.textContent).toContain('Message not found')
        expect(mockRequest).not.toHaveBeenCalled()
    })

    it('renders the message content after loading', async () => {
        history.replaceState({}, '', '?messageId=msg-1')
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'getMessageToSign') {
                return {
                    message: {
                        message: 'Hello, Canton',
                        origin: 'https://dapp.example',
                        status: 'pending',
                    },
                }
            }
            return undefined
        })

        el = await fixture<UserUiSignMessage>(componentFixture)

        await waitUntil(() => el.message === 'Hello, Canton')

        expect(el.shadowRoot?.textContent).toContain('Hello, Canton')
        expect(el.shadowRoot?.textContent).toContain('https://dapp.example')
        expect(el.shadowRoot?.querySelector('.btn-primary')).not.toBeNull()
    })

    it('calls signMessage when approve is clicked', async () => {
        history.replaceState({}, '', '?messageId=msg-1')
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'getMessageToSign') {
                return {
                    message: {
                        message: 'Sign me',
                        status: 'pending',
                    },
                }
            }
            if (method === 'signMessage') {
                return undefined
            }
            return undefined
        })

        el = await fixture<UserUiSignMessage>(componentFixture)
        await waitUntil(() => el.message === 'Sign me')

        el.shadowRoot?.querySelector<HTMLButtonElement>('.btn-primary')?.click()

        await waitUntil(() =>
            mockRequest.mock.calls.some((c) => c[0]?.method === 'signMessage')
        )
        await waitUntil(
            () => setLocationHref.mock.calls.length > 0,
            'navigation after sign',
            { timeout: 1000 }
        )

        expect(mockRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'signMessage',
                params: { messageId: 'msg-1' },
            })
        )
    })

    it('calls deleteMessageToSign when reject is confirmed', async () => {
        history.replaceState({}, '', '?messageId=msg-1')
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'getMessageToSign') {
                return {
                    message: {
                        message: 'Sign me',
                        status: 'pending',
                    },
                }
            }
            if (method === 'deleteMessageToSign') {
                return undefined
            }
            return undefined
        })

        el = await fixture<UserUiSignMessage>(componentFixture)
        await waitUntil(() => el.message === 'Sign me')

        el.shadowRoot
            ?.querySelector<HTMLButtonElement>('.btn-outline-danger')
            ?.click()

        await waitUntil(() =>
            mockRequest.mock.calls.some(
                (c) => c[0]?.method === 'deleteMessageToSign'
            )
        )
        await waitUntil(
            () => setLocationHref.mock.calls.length > 0,
            'navigation after reject',
            { timeout: 1000 }
        )

        expect(mockRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'deleteMessageToSign',
                params: { messageId: 'msg-1' },
            })
        )
    })

    it('shows the extracted RPC error message when signMessage fails', async () => {
        history.replaceState({}, '', '?messageId=msg-1')
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'getMessageToSign') {
                return {
                    message: { message: 'Sign me', status: 'pending' },
                }
            }
            if (method === 'signMessage') {
                throw makeRpcTransportError('Party not authorized to sign')
            }
            return undefined
        })

        el = await fixture<UserUiSignMessage>(componentFixture)
        await waitUntil(() => el.message === 'Sign me')

        el.shadowRoot?.querySelector<HTMLButtonElement>('.btn-primary')?.click()

        await waitUntil(() => handleErrorToast.mock.calls.length > 0)

        expect(handleErrorToast).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Party not authorized to sign',
            }),
            { message: 'Party not authorized to sign' }
        )
        expect(setLocationHref).not.toHaveBeenCalled()
        expect(el.isApproving).toBe(false)
    })

    it('shows a fallback error message when reject fails without RPC details', async () => {
        history.replaceState({}, '', '?messageId=msg-1')
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'getMessageToSign') {
                return {
                    message: { message: 'Sign me', status: 'pending' },
                }
            }
            if (method === 'deleteMessageToSign') {
                throw new Error('network failure')
            }
            return undefined
        })

        el = await fixture<UserUiSignMessage>(componentFixture)
        await waitUntil(() => el.message === 'Sign me')

        el.shadowRoot
            ?.querySelector<HTMLButtonElement>('.btn-outline-danger')
            ?.click()

        await waitUntil(() => handleErrorToast.mock.calls.length > 0)

        expect(handleErrorToast).toHaveBeenCalledWith(expect.any(Error), {
            message: 'Error rejecting message',
        })
        expect(setLocationHref).not.toHaveBeenCalled()
        expect(el.isDeleting).toBe(false)
    })

    it('closes the window after approve when opened from a dApp with closeafteraction', async () => {
        history.replaceState({}, '', '?messageId=msg-1&closeafteraction')
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'getMessageToSign') {
                return {
                    message: { message: 'Sign me', status: 'pending' },
                }
            }
            if (method === 'signMessage') {
                return undefined
            }
            return undefined
        })

        el = await fixture<UserUiSignMessage>(componentFixture)
        await waitUntil(() => el.message === 'Sign me')

        setLocationHref.mockClear()
        const openerGet = vi
            .spyOn(window, 'opener', 'get')
            .mockReturnValue({} as Window)
        const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => {})

        el.shadowRoot?.querySelector<HTMLButtonElement>('.btn-primary')?.click()

        await waitUntil(() =>
            mockRequest.mock.calls.some((c) => c[0]?.method === 'signMessage')
        )
        await waitUntil(
            () => closeSpy.mock.calls.length > 0,
            'close popup after sign',
            { timeout: 3000 }
        )

        openerGet.mockRestore()
        closeSpy.mockRestore()

        expect(setLocationHref).not.toHaveBeenCalled()
    })

    it('redirects to activities after approve when closeafteraction is not set', async () => {
        history.replaceState({}, '', '?messageId=msg-1')
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'getMessageToSign') {
                return {
                    message: { message: 'Sign me', status: 'pending' },
                }
            }
            if (method === 'signMessage') {
                return undefined
            }
            return undefined
        })

        el = await fixture<UserUiSignMessage>(componentFixture)
        await waitUntil(() => el.message === 'Sign me')

        const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => {})

        el.shadowRoot?.querySelector<HTMLButtonElement>('.btn-primary')?.click()

        await waitUntil(() =>
            mockRequest.mock.calls.some((c) => c[0]?.method === 'signMessage')
        )
        await waitUntil(
            () => setLocationHref.mock.calls.length > 0,
            'redirect after sign',
            { timeout: 3000 }
        )
        closeSpy.mockRestore()

        expect(closeSpy).not.toHaveBeenCalled()
        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/activities')
        )
        expect(el.disabled).toBe(true)
    })
})
