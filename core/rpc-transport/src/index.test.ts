// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorCodes, JsonRpcError } from '@canton-network/core-rpc-errors'
import { HttpTransport, jsonRpcRequest, jsonRpcResponse } from './index.js'

describe('jsonRpc helpers', () => {
    it('builds request and response envelopes', () => {
        expect(jsonRpcRequest('1', { method: 'isConnected' })).toEqual({
            jsonrpc: '2.0',
            id: '1',
            method: 'isConnected',
        })
        expect(jsonRpcResponse('1', { result: { isConnected: true } })).toEqual(
            {
                jsonrpc: '2.0',
                id: '1',
                result: { isConnected: true },
            }
        )
    })
})

describe('HttpTransport', () => {
    let fetchMock: ReturnType<typeof vi.fn>
    const url = new URL('https://wallet.example/rpc')

    beforeEach(() => {
        fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('sets authorization header when an access token is provided', async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ result: 'ok' }), {
                headers: { 'Content-Type': 'application/json' },
            })
        )

        await expect(
            new HttpTransport(url, 'token').submit({ method: 'ledgerApi' })
        ).resolves.toEqual({ result: 'ok' })

        const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
        expect(init.method).toBe('POST')
        expect(new Headers(init.headers).get('Authorization')).toBe(
            'Bearer token'
        )

        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ result: 'ok' }), {
                headers: { 'Content-Type': 'application/json' },
            })
        )
        await new HttpTransport(url).submit({ method: 'ledgerApi' })
        const [, noAuthInit] = fetchMock.mock.calls[1] as [string, RequestInit]
        expect(new Headers(noAuthInit.headers).get('Authorization')).toBeNull()
    })

    it('returns parsed success results', async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ result: { isConnected: true } }), {
                headers: { 'Content-Type': 'application/json' },
            })
        )

        await expect(
            new HttpTransport(url).submit({ method: 'isConnected' })
        ).resolves.toEqual({ result: { isConnected: true } })
    })

    it.each([
        [500, errorCodes.rpc.internal],
        [400, errorCodes.rpc.invalidRequest],
        [401, errorCodes.provider.unauthorized],
        [403, errorCodes.provider.unauthorized],
        [404, errorCodes.rpc.resourceNotFound],
        [413, errorCodes.rpc.limitExceeded],
        [429, errorCodes.rpc.limitExceeded],
        [503, errorCodes.rpc.resourceUnavailable],
    ])(
        'maps HTTP %i without a JSON-RPC body to code %i',
        async (status, code) => {
            fetchMock.mockResolvedValue(new Response('body', { status }))

            const pending = new HttpTransport(url).submit({
                method: 'isConnected',
            })
            await expect(pending).rejects.toBeInstanceOf(JsonRpcError)
            await expect(pending).rejects.toMatchObject({
                code,
                message: `HTTP ${status}`,
                data: 'body',
            })
        }
    )

    it('throws network failures as internal JSON-RPC errors', async () => {
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

        const pending = new HttpTransport(url).submit({ method: 'isConnected' })
        await expect(pending).rejects.toBeInstanceOf(JsonRpcError)
        await expect(pending).rejects.toMatchObject({
            code: errorCodes.rpc.internal,
            message: 'Failed to fetch',
        })
    })

    it.each([400, 200])(
        'throws JSON-RPC error bodies as JSON-RPC errors (HTTP %i)',
        async (status) => {
            fetchMock.mockResolvedValue(
                new Response(
                    JSON.stringify({
                        jsonrpc: '2.0',
                        id: '1',
                        error: { code: 4100, message: 'Unauthorized' },
                    }),
                    { status }
                )
            )

            const pending = new HttpTransport(url).submit({
                method: 'isConnected',
            })
            await expect(pending).rejects.toBeInstanceOf(JsonRpcError)
            await expect(pending).rejects.toMatchObject({
                code: 4100,
                message: 'Unauthorized',
            })
        }
    )
})
