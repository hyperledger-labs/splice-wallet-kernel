// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EventListener } from '@canton-network/core-splice-provider'
import type { StatusEvent } from '@canton-network/core-wallet-dapp-rpc-client'
import { JsonRpcError } from '@canton-network/core-rpc-errors'
import { WALLETCONNECT_ICON } from '../assets'
import {
    WalletConnectAdapter,
    type WalletConnectAdapterConfig,
} from './walletconnect-adapter'

const { mockSession, mockSignClient, SignClientInit, sessionEventHandler } =
    vi.hoisted(() => {
        // An approved WalletConnect session holding a canton namespace, the
        // shape restore() looks for among the SignClient's persisted sessions.
        const mockSession = {
            topic: 'session-topic',
            namespaces: {
                canton: {
                    accounts: ['account'],
                },
            },
        }

        let sessionEventHandler:
            | ((event: {
                  params: { event: { name: string; data: unknown } }
              }) => void)
            | undefined

        const mockSignClient = {
            connect: vi.fn().mockResolvedValue({
                uri: 'wc:test-uri',
                approval: vi.fn().mockResolvedValue(mockSession),
            }),
            request: vi.fn(),
            disconnect: vi.fn(),
            on: vi.fn((event: string, handler: (arg: unknown) => void) => {
                if (event === 'session_event') sessionEventHandler = handler
            }),
            session: {
                getAll: vi.fn().mockReturnValue([]),
            },
        }

        return {
            mockSession,
            mockSignClient,
            SignClientInit: vi.fn().mockResolvedValue(mockSignClient),
            sessionEventHandler: () => sessionEventHandler,
        }
    })

vi.mock('@walletconnect/sign-client', () => ({
    default: {
        init: SignClientInit,
    },
}))

vi.mock('uuid', () => ({
    v4: vi.fn(() => 'generated-nonce'),
}))

const makeAdapter = (
    overrides: Partial<
        Pick<
            WalletConnectAdapterConfig,
            'onUri' | 'onSignInWithCanton' | 'signInWithCanton'
        >
    > = {}
) =>
    WalletConnectAdapter.create({
        projectId: 'test-project-id',
        ...overrides,
    })

describe('WalletConnectAdapter', () => {
    beforeEach(() => {})

    it('exposes wallet picker metadata', () => {
        const adapter = makeAdapter()

        expect(adapter.providerId).toBe('walletconnect')
        expect(adapter.getInfo()).toEqual({
            providerId: 'walletconnect',
            name: 'WalletConnect',
            type: 'mobile',
            icon: WALLETCONNECT_ICON,
            description: 'Connect via WalletConnect',
            reuseGlobalWalletPopup: true,
        })
    })

    it('returns itself as the provider instance', () => {
        const adapter = makeAdapter()

        expect(adapter.provider()).toBe(adapter)
    })

    it('reports disconnected status before a session exists', async () => {
        const adapter = makeAdapter()

        await expect(adapter.request({ method: 'status' })).resolves.toEqual({
            provider: {
                id: 'walletconnect',
                providerType: 'mobile',
            },
            connection: {
                isConnected: false,
                isNetworkConnected: false,
            },
        })
    })

    it('establishes a session on connect and emits statusChanged', async () => {
        const onUri = vi.fn()
        const statusListener = vi.fn<EventListener<StatusEvent>>()
        const adapter = makeAdapter({ onUri })
        adapter.on('statusChanged', statusListener)

        await expect(adapter.request({ method: 'connect' })).resolves.toEqual({
            isConnected: true,
            isNetworkConnected: true,
        })

        expect(SignClientInit).toHaveBeenCalledWith(
            expect.objectContaining({ projectId: 'test-project-id' })
        )
        expect(onUri).toHaveBeenCalledWith('wc:test-uri')
        expect(statusListener).toHaveBeenCalledWith(
            expect.objectContaining({
                connection: {
                    isConnected: true,
                    isNetworkConnected: true,
                },
            })
        )
    })

    it('disconnects the WalletConnect session and emits a local status update', async () => {
        const adapter = makeAdapter()
        const statusListener = vi.fn<EventListener<StatusEvent>>()

        await adapter.request({ method: 'connect' })
        adapter.on('statusChanged', statusListener)
        statusListener.mockClear()

        await expect(
            adapter.request({ method: 'disconnect' })
        ).resolves.toBeNull()

        expect(mockSignClient.disconnect).toHaveBeenCalledWith({
            topic: 'session-topic',
            reason: { code: 6000, message: 'User disconnected' },
        })
        expect(statusListener).toHaveBeenCalledWith(
            expect.objectContaining({
                connection: expect.objectContaining({
                    isConnected: false,
                    reason: 'User disconnected',
                }),
            })
        )
    })

    it('buffers events until a listener is attached', () => {
        const adapter = makeAdapter()
        const listener = vi.fn<EventListener<StatusEvent>>()

        adapter.emit('statusChanged', {
            provider: { id: 'walletconnect', providerType: 'mobile' },
            connection: { isConnected: true, isNetworkConnected: true },
        })
        expect(listener).not.toHaveBeenCalled()

        adapter.on('statusChanged', listener)
        expect(listener).toHaveBeenCalledWith(
            expect.objectContaining({
                connection: { isConnected: true, isNetworkConnected: true },
            })
        )
    })

    it('removes event listeners', () => {
        const adapter = makeAdapter()
        const listener = vi.fn<EventListener<StatusEvent>>()

        adapter.on('statusChanged', listener)
        adapter.removeListener('statusChanged', listener)
        adapter.emit('statusChanged', {
            provider: { id: 'walletconnect', providerType: 'mobile' },
            connection: { isConnected: false, isNetworkConnected: false },
        })

        expect(listener).not.toHaveBeenCalled()
    })

    it('restores an existing Canton WalletConnect session', async () => {
        mockSignClient.session.getAll.mockReturnValueOnce([mockSession])

        const adapter = makeAdapter()
        const restored = await adapter.restore()

        expect(restored).toBe(adapter)
        expect(mockSignClient.on).toHaveBeenCalledWith(
            'session_event',
            expect.any(Function)
        )
    })

    it('forwards session events to local listeners', async () => {
        mockSignClient.session.getAll.mockReturnValueOnce([mockSession])
        const adapter = makeAdapter()
        const listener = vi.fn()

        await adapter.restore()
        adapter.on('accountsChanged', listener)

        sessionEventHandler()?.({
            params: {
                event: {
                    name: 'accountsChanged',
                    data: [{ partyId: 'party::alice' }],
                },
            },
        })

        expect(listener).toHaveBeenCalledWith([{ partyId: 'party::alice' }])
    })

    it('maps prepareExecute to canton_prepareSignExecute and emits txChanged', async () => {
        const adapter = makeAdapter()
        const txListener = vi.fn()

        await adapter.request({ method: 'connect' })
        adapter.on('txChanged', txListener)

        mockSignClient.request.mockResolvedValueOnce({
            commandId: 'cmd-1',
            status: 'executed',
            payload: { updateId: '1', completionOffset: 1 },
        })

        await expect(
            adapter.request({
                method: 'prepareExecute',
                params: { commands: [] },
            })
        ).resolves.toEqual({
            tx: {
                commandId: 'cmd-1',
                status: 'executed',
                payload: { updateId: '1', completionOffset: 1 },
            },
        })

        expect(mockSignClient.request).toHaveBeenCalledWith({
            topic: 'session-topic',
            chainId: 'canton:devnet',
            request: {
                method: 'canton_prepareSignExecute',
                params: { commands: [] },
            },
        })
        expect(txListener).toHaveBeenCalledWith({
            commandId: 'cmd-1',
            status: 'executed',
            payload: { updateId: '1', completionOffset: 1 },
        })
    })

    it('rejects WalletConnect RPC failures with the wallet error code', async () => {
        const adapter = makeAdapter()

        await adapter.request({ method: 'connect' })

        mockSignClient.request.mockImplementationOnce(() =>
            Promise.reject({ code: 4001, message: 'User rejected' })
        )

        const pending = adapter.request({ method: 'listAccounts' })
        await expect(pending).rejects.toBeInstanceOf(JsonRpcError)
        await expect(pending).rejects.toMatchObject({
            code: 4001,
            message: 'User rejected',
        })
    })

    it('only posts WalletConnect URI to dApp origin, not wildcard', async () => {
        const mockPostMessage = vi.fn()
        const mockPopupWindow = {
            postMessage: mockPostMessage,
            closed: false,
        }

        const windowSpy = vi
            .spyOn(window, 'open')
            .mockReturnValue(mockPopupWindow as unknown as Window)

        const adapter = makeAdapter()
        await adapter.request({ method: 'connect' })

        expect(windowSpy).toHaveBeenCalledWith('', 'wallet-popup')
        expect(mockPostMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'wc-uri',
                uri: 'wc:test-uri',
            }),
            window.location.origin
        )
        expect(mockPostMessage).not.toHaveBeenCalledWith(
            expect.any(Object),
            '*'
        )

        // Resets real window.open behavior
        windowSpy.mockRestore()
    })
})
