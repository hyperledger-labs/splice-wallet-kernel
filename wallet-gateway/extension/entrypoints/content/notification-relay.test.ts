// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WalletEvent } from '@canton-network/core-types'
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import type { Browser } from 'wxt/browser'
import { asPort, type FakePort, fakePort } from '@/tests/unit/fake-port'
import { isConnectedResponse, NotificationRelay } from './notification-relay'

const connectedStatus = {
    provider: { id: 'browser:ext:canton-wallet', providerType: 'browser' },
    connection: {
        isConnected: true,
        reason: 'OK',
        isNetworkConnected: true,
        networkReason: 'OK',
    },
}

describe('isConnectedResponse', () => {
    it.each([
        ['connect', { isConnected: true }, true],
        ['connect', { isConnected: false }, false],
        ['status', connectedStatus, true],
        [
            'status',
            {
                ...connectedStatus,
                connection: {
                    ...connectedStatus.connection,
                    isConnected: false,
                },
            },
            false,
        ],
        ['listAccounts', { isConnected: true }, false],
        ['connect', null, false],
        ['status', undefined, false],
    ])('%s → %j is %s', (method, result, expected) => {
        expect(isConnectedResponse(method, result)).toBe(expected)
    })
})

describe('NotificationRelay', () => {
    let ports: FakePort[]
    let connect: Mock<() => Browser.runtime.Port>
    let postMessage: Mock
    let relay: NotificationRelay

    const lastPort = () => ports[ports.length - 1]!

    beforeEach(() => {
        ports = []
        connect = vi.fn(() => {
            const port = fakePort()
            ports.push(port)
            return asPort(port)
        })
        postMessage = vi.fn()
        relay = new NotificationRelay({
            connect,
            window: { postMessage },
            target: 'runtime-id',
        })
    })

    it('opens the port after a connected `connect` or `status` response', () => {
        relay.onResponse('listAccounts', [])
        relay.onResponse('connect', { isConnected: false })
        expect(connect).not.toHaveBeenCalled()

        relay.onResponse('connect', { isConnected: true })
        expect(connect).toHaveBeenCalledTimes(1)
        expect(relay.isOpen).toBe(true)
    })

    it('opens at most one port', () => {
        relay.onResponse('connect', { isConnected: true })
        relay.onResponse('status', connectedStatus)

        expect(connect).toHaveBeenCalledTimes(1)
    })

    it('posts port messages to the page as JSON-RPC notifications', () => {
        relay.open()

        lastPort().receive({
            method: 'txChanged',
            params: { status: 'pending', commandId: 'c1' },
        })
        lastPort().receive({ method: 'accountsChanged', params: [] })

        expect(postMessage.mock.calls).toEqual([
            [
                {
                    type: WalletEvent.SPLICE_WALLET_REQUEST,
                    request: {
                        jsonrpc: '2.0',
                        method: 'txChanged',
                        params: { status: 'pending', commandId: 'c1' },
                    },
                    target: 'runtime-id',
                },
                '*',
            ],
            [
                {
                    type: WalletEvent.SPLICE_WALLET_REQUEST,
                    request: {
                        jsonrpc: '2.0',
                        method: 'accountsChanged',
                        params: [],
                    },
                    target: 'runtime-id',
                },
                '*',
            ],
        ])
        // notifications carry no id, so the page never treats them as responses
        expect(postMessage.mock.calls[0]![0].request).not.toHaveProperty('id')
    })

    it('omits missing params and drops non-structured params', () => {
        relay.open()

        lastPort().receive({ method: 'connected' })
        lastPort().receive({ method: 'txChanged', params: 'not-an-object' })

        expect(postMessage).toHaveBeenCalledTimes(1)
        expect(postMessage.mock.calls[0]![0].request).toEqual({
            jsonrpc: '2.0',
            method: 'connected',
        })
    })

    it('reopens the port after the background closed it (e.g. on logout)', () => {
        relay.onResponse('connect', { isConnected: true })
        lastPort().remoteDisconnect()
        expect(relay.isOpen).toBe(false)

        relay.onResponse('connect', { isConnected: true })
        expect(connect).toHaveBeenCalledTimes(2)
        expect(relay.isOpen).toBe(true)
    })

    it('ignores a disconnect of a port it already replaced', () => {
        relay.open()
        const first = lastPort()
        relay.close()
        relay.open()

        first.remoteDisconnect()

        expect(relay.isOpen).toBe(true)
        expect(first.disconnect).toHaveBeenCalledTimes(1)
    })

    it('stays closed when the port cannot be opened', () => {
        connect.mockImplementationOnce(() => {
            throw new Error('Extension context invalidated.')
        })

        expect(() => relay.open()).not.toThrow()
        expect(relay.isOpen).toBe(false)
    })
})
