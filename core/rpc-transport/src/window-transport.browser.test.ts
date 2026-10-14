// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WalletEvent } from '@canton-network/core-types'
import { JsonRpcError } from '@canton-network/core-rpc-errors'
import { WindowTransport } from './index.js'

// only tested when running in browser environment

vi.mock('uuid', () => ({ v4: () => 'request-id' }))

describe('WindowTransport', () => {
    beforeEach(() => {
        vi.spyOn(window, 'postMessage')
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    function dispatchMessage(data: unknown) {
        window.dispatchEvent(new MessageEvent('message', { data }))
    }

    it('submits requests and resolves matching responses', async () => {
        const transport = new WindowTransport(window)
        const resultPromise = transport.submit({ method: 'isConnected' })

        expect(window.postMessage).toHaveBeenCalledWith(
            {
                type: WalletEvent.SPLICE_WALLET_REQUEST,
                request: {
                    jsonrpc: '2.0',
                    id: 'request-id',
                    method: 'isConnected',
                },
            },
            '*'
        )

        dispatchMessage({
            type: WalletEvent.SPLICE_WALLET_RESPONSE,
            response: {
                jsonrpc: '2.0',
                id: 'unmatched-response',
                result: { messageSignature: 'abc' },
            },
        })

        dispatchMessage({
            type: WalletEvent.SPLICE_WALLET_RESPONSE,
            response: {
                jsonrpc: '2.0',
                id: 'request-id',
                result: { isConnected: true },
            },
        })

        await expect(resultPromise).resolves.toEqual({
            jsonrpc: '2.0',
            id: 'request-id',
            result: { isConnected: true },
        })
    })

    it('rejects matching error responses', async () => {
        const transport = new WindowTransport(window)
        const resultPromise = transport.submit({ method: 'invalidRequest' })

        dispatchMessage({
            type: WalletEvent.SPLICE_WALLET_RESPONSE,
            response: {
                jsonrpc: '2.0',
                id: 'request-id',
                error: { code: -32600, message: 'Invalid Request' },
            },
        })

        await expect(resultPromise).rejects.toBeInstanceOf(JsonRpcError)
        await expect(resultPromise).rejects.toMatchObject({
            code: -32600,
            message: 'Invalid Request',
        })
    })

    it('posts responses via submitResponse', () => {
        new WindowTransport(window).submitResponse('response-id', {
            result: 'ok',
        })

        expect(window.postMessage).toHaveBeenCalledWith(
            {
                type: WalletEvent.SPLICE_WALLET_RESPONSE,
                response: {
                    jsonrpc: '2.0',
                    id: 'response-id',
                    result: 'ok',
                },
            },
            '*'
        )
    })

    describe('onNotification', () => {
        it('delivers wallet notifications', () => {
            const transport = new WindowTransport(window)
            const received: unknown[] = []
            const unsubscribe = transport.onNotification((method, params) => {
                received.push({ method, params })
            })

            dispatchMessage({
                type: WalletEvent.SPLICE_WALLET_REQUEST,
                request: {
                    jsonrpc: '2.0',
                    method: 'txChanged',
                    params: { commandId: 'cmd-1' },
                },
            })

            expect(received).toEqual([
                { method: 'txChanged', params: { commandId: 'cmd-1' } },
            ])
            unsubscribe()
        })

        it('ignores requests with id and not matching targets', () => {
            const transport = new WindowTransport(window, {
                target: 'wallet-a',
            })
            const received: unknown[] = []
            transport.onNotification((method) => received.push(method))

            dispatchMessage({
                type: WalletEvent.SPLICE_WALLET_REQUEST,
                target: 'wallet-a',
                request: {
                    jsonrpc: '2.0',
                    id: 'shouldnt-be-here',
                    method: 'accountsChanged',
                },
            })
            dispatchMessage({
                type: WalletEvent.SPLICE_WALLET_REQUEST,
                target: 'wallet-b',
                request: {
                    jsonrpc: '2.0',
                    method: 'accountsChanged',
                },
            })
            dispatchMessage({
                type: WalletEvent.SPLICE_WALLET_REQUEST,
                request: {
                    jsonrpc: '2.0',
                    method: 'accountsChanged',
                },
            })
            dispatchMessage({
                type: WalletEvent.SPLICE_WALLET_REQUEST,
                target: 'wallet-a',
                request: {
                    jsonrpc: '2.0',
                    method: 'txChanged',
                },
            })

            expect(received).toEqual(['txChanged'])
        })

        it('removes the listener when the last handler unsubscribes', () => {
            const transport = new WindowTransport(window)
            const handler = vi.fn()
            const unsubscribe = transport.onNotification(handler)

            unsubscribe()
            dispatchMessage({
                type: WalletEvent.SPLICE_WALLET_REQUEST,
                request: {
                    jsonrpc: '2.0',
                    method: 'txChanged',
                },
            })

            expect(handler).not.toHaveBeenCalled()
        })
    })
})
