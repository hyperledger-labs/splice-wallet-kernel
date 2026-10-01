// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { vi, type MockedObject } from 'vitest'
import type { AccessTokenProvider } from '@canton-network/core-wallet-auth'

// TODO: switch to logtape like the other core packages (see #2667)
type Logger = Pick<Console, 'debug' | 'info' | 'warn' | 'error'>

export const mockLogger: MockedObject<Logger> = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
} as MockedObject<Logger>

export function createAccessTokenProvider(
    token?: string | undefined
): AccessTokenProvider {
    return {
        getAccessToken: vi.fn().mockResolvedValue(token),
        getAuthContext: vi.fn().mockResolvedValue(''),
    } as unknown as AccessTokenProvider
}

export function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

export function requestUrl(input: RequestInfo | URL): string {
    if (typeof input === 'string') {
        return input
    }
    if (input instanceof URL) {
        return input.href
    }
    if (input instanceof Request) {
        return input.url
    }
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

export function getRequestUrl(
    fetchMock: ReturnType<typeof vi.fn>,
    pathSuffix: string
): string {
    return requestUrl(findFetchCall(fetchMock, pathSuffix)[0])
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
        new Headers(initHeaders).forEach((value, key) => {
            headers.set(key, value)
        })
    }
    return Object.fromEntries(headers.entries())
}
