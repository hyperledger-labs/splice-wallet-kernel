// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixture, waitUntil } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { JsonRpcError } from '@canton-network/core-rpc-errors'
import { createMockUserClient, mockRequest } from '../__tests__/test-helpers.js'

const { mockCreateUserClient, handleErrorToast, setLocationHref, showToast } =
    vi.hoisted(() => ({
        mockCreateUserClient: vi.fn(),
        handleErrorToast: vi.fn(),
        setLocationHref: vi.fn(),
        showToast: vi.fn(),
    }))

vi.mock('../index.js', () => ({}))
vi.mock('../utils.js', () => ({ showToast }))
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

function approveButton(el: UserUiSignMessage) {
    return el.shadowRoot
        ?.querySelector('wg-message-detail')
        ?.shadowRoot?.querySelector<HTMLButtonElement>('.btn-primary')
}

function rejectButton(el: UserUiSignMessage) {
    return el.shadowRoot
        ?.querySelector('wg-message-detail')
        ?.shadowRoot?.querySelector<HTMLButtonElement>('.btn-outline-danger')
}

function detailText(el: UserUiSignMessage) {
    return el.shadowRoot?.querySelector('wg-message-detail')?.shadowRoot
        ?.textContent
}

const signedResult = {
    status: 'signed',
    signature: 'signature',
    publicKey: 'public-key',
}

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
        showToast.mockReset()
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

        await waitUntil(() => !el.isLoading && el.message === 'Hello, Canton')

        expect(detailText(el)).toContain('Hello, Canton')
        expect(detailText(el)).toContain('https://dapp.example')
        expect(approveButton(el)).not.toBeNull()
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
                return signedResult
            }
            return undefined
        })

        el = await fixture<UserUiSignMessage>(componentFixture)
        await waitUntil(() => !el.isLoading && el.message === 'Sign me')

        approveButton(el)?.click()

        await waitUntil(() =>
            mockRequest.mock.calls.some((c) => c[0]?.method === 'signMessage')
        )
        await waitUntil(
            () => setLocationHref.mock.calls.length > 0,
            'navigation after sign',
            { timeout: 3000 }
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
        await waitUntil(() => !el.isLoading && el.message === 'Sign me')

        rejectButton(el)?.click()

        await waitUntil(() =>
            mockRequest.mock.calls.some(
                (c) => c[0]?.method === 'deleteMessageToSign'
            )
        )
        await waitUntil(
            () => setLocationHref.mock.calls.length > 0,
            'navigation after reject',
            { timeout: 3000 }
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
        await waitUntil(() => !el.isLoading && el.message === 'Sign me')

        approveButton(el)?.click()

        await waitUntil(() => handleErrorToast.mock.calls.length > 0)

        expect(handleErrorToast).toHaveBeenCalledWith(expect.any(Error), {
            message: 'Error signing message',
        })
        expect(setLocationHref).not.toHaveBeenCalled()
        expect(el.isApproving).toBe(false)
    })

    it('shows the failure reason and stays on the page when the signing provider fails the message', async () => {
        history.replaceState({}, '', '?messageId=msg-1')
        let stored: Record<string, string> = {
            message: 'Sign me',
            status: 'pending',
        }
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'getMessageToSign') {
                return { message: stored }
            }
            if (method === 'signMessage') {
                stored = {
                    ...stored,
                    status: 'failed',
                    failureReason: 'Signing provider returned status: rejected',
                }
                return {
                    status: 'failed',
                    publicKey: 'public-key',
                    failureReason: 'Signing provider returned status: rejected',
                }
            }
            return undefined
        })

        el = await fixture<UserUiSignMessage>(componentFixture)
        await waitUntil(() => !el.isLoading && el.message === 'Sign me')

        approveButton(el)?.click()

        await waitUntil(() => el.status === 'failed')
        await el.updateComplete

        expect(el.shadowRoot?.querySelector('.alert')?.textContent).toContain(
            'Signing provider returned status: rejected'
        )
        expect(showToast).not.toHaveBeenCalled()
        expect(handleErrorToast).not.toHaveBeenCalled()
        expect(setLocationHref).not.toHaveBeenCalled()
        expect(approveButton(el)).toBeNull()
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
        await waitUntil(() => !el.isLoading && el.message === 'Sign me')

        rejectButton(el)?.click()

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
                return signedResult
            }
            return undefined
        })

        el = await fixture<UserUiSignMessage>(componentFixture)
        await waitUntil(() => !el.isLoading && el.message === 'Sign me')

        setLocationHref.mockClear()
        const openerGet = vi
            .spyOn(window, 'opener', 'get')
            .mockReturnValue({} as Window)
        const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => {})

        approveButton(el)?.click()

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
                return signedResult
            }
            return undefined
        })

        el = await fixture<UserUiSignMessage>(componentFixture)
        await waitUntil(() => !el.isLoading && el.message === 'Sign me')

        const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => {})

        approveButton(el)?.click()

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

    it('shows an error when getMessageToSign fails', async () => {
        history.replaceState({}, '', '?messageId=msg-1')
        mockRequest.mockRejectedValue(new Error('not found'))

        el = await fixture<UserUiSignMessage>(componentFixture)
        await waitUntil(() => !el.isLoading && el.loadError !== null)

        expect(el.shadowRoot?.textContent).toContain('Message not found.')
        expect(callsTo('getSignMessageStatus')).toBe(0)
    })

    describe('polling while awaiting a signature', () => {
        const POLL_MS = 20
        const pollingFixture = html`<user-ui-sign-message
            .pollIntervalMs=${POLL_MS}
        ></user-ui-sign-message>`

        let stored: Record<string, string>
        let statusResult: Record<string, string>

        beforeEach(() => {
            history.replaceState({}, '', '?messageId=msg-1')
            stored = { message: 'Sign me', status: 'awaiting-signature' }
            statusResult = { status: 'awaiting-signature' }
            mockRequest.mockImplementation(async ({ method }) => {
                if (method === 'getMessageToSign') {
                    return { message: stored }
                }
                if (method === 'getSignMessageStatus') {
                    stored = { ...stored, ...statusResult }
                    return statusResult
                }
                return undefined
            })
        })

        afterEach(() => {
            el?.remove()
        })

        it('starts polling when signMessage returns awaiting-signature and closes once signed', async () => {
            stored = { message: 'Sign me', status: 'pending' }
            const defaultImpl = mockRequest.getMockImplementation()!
            mockRequest.mockImplementation(async (args) => {
                if (args.method === 'signMessage') {
                    stored = { ...stored, status: 'awaiting-signature' }
                    return {
                        status: 'awaiting-signature',
                        publicKey: 'public-key',
                        externalTxId: 'provider-req-1',
                    }
                }
                return defaultImpl(args)
            })

            el = await fixture<UserUiSignMessage>(pollingFixture)
            await waitUntil(() => !el.isLoading && el.status === 'pending')
            expect(callsTo('getSignMessageStatus')).toBe(0)

            approveButton(el)?.click()
            await waitUntil(() => el.status === 'awaiting-signature')
            await waitUntil(() => callsTo('getSignMessageStatus') > 0)

            statusResult = { status: 'signed', signature: 'sig' }
            await waitUntil(() => el.status === 'signed')
            await waitUntil(
                () => setLocationHref.mock.calls.length > 0,
                'navigation after the provider signed',
                { timeout: 3000 }
            )

            expect(showToast).toHaveBeenCalledWith(
                '',
                'Message signed successfully',
                'success'
            )
        })

        it('starts polling right away when the message is already awaiting a signature', async () => {
            el = await fixture<UserUiSignMessage>(pollingFixture)

            await waitUntil(() => callsTo('getSignMessageStatus') >= 2)

            expect(mockRequest).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: 'getSignMessageStatus',
                    params: { messageId: 'msg-1' },
                })
            )
            expect(callsTo('getMessageToSign')).toBe(1)
        })

        it('shows the failure reason and stops polling when the provider fails the message', async () => {
            el = await fixture<UserUiSignMessage>(pollingFixture)
            await waitUntil(() => callsTo('getSignMessageStatus') > 0)

            statusResult = {
                status: 'failed',
                failureReason: 'Signing provider returned status: rejected',
            }
            await waitUntil(() => el.status === 'failed')
            await el.updateComplete

            expect(
                el.shadowRoot?.querySelector('.alert')?.textContent
            ).toContain('Signing provider returned status: rejected')
            const pollsAfterFailure = callsTo('getSignMessageStatus')
            await sleep(POLL_MS * 5)
            expect(callsTo('getSignMessageStatus')).toBe(pollsAfterFailure)
            expect(setLocationHref).not.toHaveBeenCalled()
        })

        it('pauses polling while the document is hidden and resumes when visible', async () => {
            el = await fixture<UserUiSignMessage>(pollingFixture)
            await waitUntil(() => callsTo('getSignMessageStatus') > 0)

            const hidden = vi
                .spyOn(document, 'hidden', 'get')
                .mockReturnValue(true)
            document.dispatchEvent(new Event('visibilitychange'))
            await sleep(POLL_MS * 2)
            const pollsWhileHidden = callsTo('getSignMessageStatus')
            await sleep(POLL_MS * 5)
            expect(callsTo('getSignMessageStatus')).toBe(pollsWhileHidden)

            hidden.mockReturnValue(false)
            document.dispatchEvent(new Event('visibilitychange'))
            await waitUntil(
                () => callsTo('getSignMessageStatus') > pollsWhileHidden
            )
            hidden.mockRestore()
        })

        it('stops polling when the element is removed', async () => {
            el = await fixture<UserUiSignMessage>(pollingFixture)
            await waitUntil(() => callsTo('getSignMessageStatus') > 0)

            el.remove()
            await sleep(POLL_MS * 2)
            const pollsAfterRemoval = callsTo('getSignMessageStatus')
            await sleep(POLL_MS * 5)

            expect(callsTo('getSignMessageStatus')).toBe(pollsAfterRemoval)
        })

        it('does not schedule another poll when a status request finishes after removal', async () => {
            const defaultImpl = mockRequest.getMockImplementation()!
            let resolveStatus: (value: unknown) => void = () => {}
            mockRequest.mockImplementation(async (args) => {
                if (args.method === 'getSignMessageStatus') {
                    return new Promise((resolve) => {
                        resolveStatus = resolve
                    })
                }
                return defaultImpl(args)
            })

            el = await fixture<UserUiSignMessage>(pollingFixture)
            await waitUntil(() => callsTo('getSignMessageStatus') === 1)

            el.remove()
            resolveStatus({ status: 'awaiting-signature' })
            await sleep(POLL_MS * 5)

            expect(callsTo('getSignMessageStatus')).toBe(1)
        })

        it('does not start polling when the initial load finishes after removal', async () => {
            const defaultImpl = mockRequest.getMockImplementation()!
            let resolveMessage: (value: unknown) => void = () => {}
            mockRequest.mockImplementation(async (args) => {
                if (args.method === 'getMessageToSign') {
                    return new Promise((resolve) => {
                        resolveMessage = resolve
                    })
                }
                return defaultImpl(args)
            })

            el = await fixture<UserUiSignMessage>(pollingFixture)
            await waitUntil(() => callsTo('getMessageToSign') === 1)

            el.remove()
            resolveMessage({ message: stored })
            await sleep(POLL_MS * 5)

            expect(callsTo('getSignMessageStatus')).toBe(0)
        })
    })
})

function callsTo(method: string) {
    return mockRequest.mock.calls.filter((c) => c[0]?.method === method).length
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
