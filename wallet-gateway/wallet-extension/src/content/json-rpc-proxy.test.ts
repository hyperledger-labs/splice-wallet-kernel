// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { errorCodes } from '@canton-network/core-rpc-errors'
import {
    type JsonRpcRequest,
    type JsonRpcResponse,
    type SpliceMessage,
    WalletEvent,
} from '@canton-network/core-types'
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { createJsonRpcProxyHandler } from './json-rpc-proxy'

const runtimeId = 'runtime-id'
const origin = 'https://dapp.example'

const connectRequest: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: 'request-1',
    method: 'connect',
}

const requestMessage = (
    request: JsonRpcRequest,
    target?: string
): SpliceMessage => ({
    type: WalletEvent.SPLICE_WALLET_REQUEST,
    request,
    ...(target && { target }),
})

/** Waits for pending promise callbacks, such as a `.catch` handler. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('createJsonRpcProxyHandler', () => {
    let page: { postMessage: Mock }
    let request: Mock<
        (request: JsonRpcRequest, origin: string) => Promise<JsonRpcResponse>
    >
    let sendMessage: Mock<(message: SpliceMessage) => Promise<unknown>>
    let onResponse: Mock
    let handle: ReturnType<typeof createJsonRpcProxyHandler>

    /** Delivers a `message` event the page posted to itself. */
    const fromPage = (data: unknown) =>
        handle({ data, source: page as unknown as Window })

    beforeEach(() => {
        page = { postMessage: vi.fn() }
        request = vi.fn()
        sendMessage = vi.fn()
        onResponse = vi.fn()
        handle = createJsonRpcProxyHandler({
            dispatcher: { request },
            sendMessage,
            notificationRelay: { onResponse },
            window: page,
            origin,
            runtimeId,
        })
    })

    it('forwards a request with the page origin and posts the response', async () => {
        const response: JsonRpcResponse = {
            jsonrpc: '2.0',
            id: 'request-1',
            result: { isConnected: true },
        }
        request.mockResolvedValue(response)

        await fromPage(requestMessage(connectRequest, runtimeId))

        expect(request).toHaveBeenCalledWith(connectRequest, origin)
        expect(page.postMessage).toHaveBeenCalledWith(
            { type: WalletEvent.SPLICE_WALLET_RESPONSE, response },
            '*'
        )
        expect(onResponse).toHaveBeenCalledWith('connect', {
            isConnected: true,
        })
    })

    it('handles requests without a target', async () => {
        request.mockResolvedValue({ jsonrpc: '2.0', id: 'request-1' })

        await fromPage(requestMessage(connectRequest))

        expect(request).toHaveBeenCalledTimes(1)
    })

    it('forwards error responses without notifying the relay', async () => {
        const response: JsonRpcResponse = {
            jsonrpc: '2.0',
            id: 'request-1',
            error: { code: 4100, message: 'User is not connected' },
        }
        request.mockResolvedValue(response)

        await fromPage(requestMessage(connectRequest))

        expect(page.postMessage).toHaveBeenCalledWith(
            { type: WalletEvent.SPLICE_WALLET_RESPONSE, response },
            '*'
        )
        expect(onResponse).not.toHaveBeenCalled()
    })

    it('answers with a JSON-RPC error when the background cannot be reached', async () => {
        request.mockRejectedValue(new Error('Extension context invalidated.'))

        await fromPage(requestMessage(connectRequest))

        expect(page.postMessage).toHaveBeenCalledWith(
            {
                type: WalletEvent.SPLICE_WALLET_RESPONSE,
                response: {
                    jsonrpc: '2.0',
                    id: 'request-1',
                    error: expect.objectContaining({
                        code: errorCodes.rpc.internal,
                        message: 'Extension context invalidated.',
                    }),
                },
            },
            '*'
        )
        expect(onResponse).not.toHaveBeenCalled()
    })

    it('ignores id-less notifications', async () => {
        await fromPage(
            requestMessage({ jsonrpc: '2.0', method: 'txChanged', params: {} })
        )

        expect(request).not.toHaveBeenCalled()
        expect(page.postMessage).not.toHaveBeenCalled()
    })

    it('ignores messages for another extension', async () => {
        await fromPage(requestMessage(connectRequest, 'other-runtime-id'))
        await fromPage({
            type: WalletEvent.SPLICE_WALLET_EXT_READY,
            target: 'other-runtime-id',
        })

        expect(request).not.toHaveBeenCalled()
        expect(page.postMessage).not.toHaveBeenCalled()
    })

    it('ignores messages from other windows, such as frames', async () => {
        await handle({
            data: requestMessage(connectRequest),
            source: {} as Window,
        })

        expect(request).not.toHaveBeenCalled()
    })

    it('ignores messages that are not Splice messages', async () => {
        await fromPage({ type: 'something-else' })
        await fromPage('hello')

        expect(request).not.toHaveBeenCalled()
        expect(page.postMessage).not.toHaveBeenCalled()
    })

    it('acknowledges the readiness request', async () => {
        await fromPage({
            type: WalletEvent.SPLICE_WALLET_EXT_READY,
            target: runtimeId,
        })

        expect(page.postMessage).toHaveBeenCalledWith(
            { type: WalletEvent.SPLICE_WALLET_EXT_ACK, target: runtimeId },
            '*'
        )
    })

    it('forwards open requests to the background', async () => {
        sendMessage.mockRejectedValue(
            new Error('Could not establish connection.')
        )
        const open: SpliceMessage = {
            type: WalletEvent.SPLICE_WALLET_EXT_OPEN,
            url: 'chrome-extension://runtime-id/popup.html',
            target: runtimeId,
        }

        await fromPage(open)
        // A missing `.catch` would surface as an unhandled rejection.
        await settle()

        expect(sendMessage).toHaveBeenCalledWith(open)
        expect(page.postMessage).not.toHaveBeenCalled()
    })
})
