// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { vi } from 'vitest'
import type { AccessTokenProvider } from '@canton-network/core-wallet-auth'
import { LedgerClient } from '../ledger-client.js'
import { createLogRecorder } from '@logtape/testing/recorder'

import { configure } from '@logtape/logtape'

export const BASE_URL = new URL('https://ledger.example/')

export function createAccessTokenProvider(token?: string): AccessTokenProvider {
    return {
        getAccessToken: vi.fn().mockResolvedValue(token),
        getAuthContext: vi.fn().mockResolvedValue(''),
    } as unknown as AccessTokenProvider
}

export function createLedgerClient(
    accessTokenProvider = createAccessTokenProvider('ledger-token'),
    version?: '3.5'
) {
    return new LedgerClient({
        baseUrl: BASE_URL,
        accessTokenProvider,
        ...(version !== undefined ? { version } : {}),
    })
}

export function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export function grpcError(message: string) {
    return { code: 9, message, details: [] as unknown[] }
}

function requestUrl(input: RequestInfo | URL): string {
    if (typeof input === 'string') return input
    if (input instanceof URL) return input.href
    if (input instanceof Request) return input.url
    return String(input)
}

function findFetchCall(
    fetchMock: ReturnType<typeof vi.fn>,
    pathSuffix: string
) {
    const call = fetchMock.mock.calls.find((c) =>
        requestUrl(c[0]).includes(pathSuffix)
    )
    if (!call) {
        throw new Error(`No fetch call matching path suffix: ${pathSuffix}`)
    }
    return call
}

export function getRequestMethod(
    fetchMock: ReturnType<typeof vi.fn>,
    pathSuffix: string
): string | undefined {
    const [input, init = {}] = findFetchCall(fetchMock, pathSuffix)
    return input instanceof Request
        ? input.method
        : (init as RequestInit).method
}

export function getRequestHeaders(
    fetchMock: ReturnType<typeof vi.fn>,
    pathSuffix: string
): Record<string, string> {
    const [input, init = {}] = findFetchCall(fetchMock, pathSuffix)
    const headers = new Headers(
        input instanceof Request ? input.headers : undefined
    )
    const initHeaders = (init as RequestInit).headers
    if (initHeaders) {
        new Headers(initHeaders).forEach((value, key) =>
            headers.set(key, value)
        )
    }
    return Object.fromEntries(headers.entries())
}

export async function initializeLogRecorder() {
    const recorder = createLogRecorder()

    await configure({
        sinks: { recorder: recorder.sink },
        loggers: [
            {
                category: ['core'],
                lowestLevel: 'trace',
                sinks: ['recorder'],
            },
            { category: ['logtape', 'meta'], sinks: [] },
        ],
    })

    return recorder
}
