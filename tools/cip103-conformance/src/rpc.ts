// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { setTimeout as sleep } from 'node:timers/promises'
import type { ProviderConfig } from './schemas'

export interface JsonRpcError {
    code: number
    message: string
}

export interface JsonRpcResponse {
    result?: unknown
    error?: JsonRpcError
}

function buildHeaders(provider: ProviderConfig): HeadersInit {
    return {
        'content-type': 'application/json',
        ...provider.headers,
    }
}

export async function jsonRpcRequest(
    provider: ProviderConfig,
    payload: unknown
): Promise<JsonRpcResponse> {
    const controller = new AbortController()
    const timeout = setTimeout(
        () => controller.abort(),
        provider.timeoutMs ?? 10000
    )

    try {
        const response = await fetch(provider.endpoint, {
            method: 'POST',
            headers: buildHeaders(provider),
            body: JSON.stringify(payload),
            signal: controller.signal,
        })
        const text = await response.text()
        if (!text.trim()) {
            return {
                error: {
                    code: -32000,
                    message: `Empty response with HTTP ${response.status}`,
                },
            }
        }
        return JSON.parse(text) as JsonRpcResponse
    } catch (error) {
        await sleep(1)
        const message = error instanceof Error ? error.message : String(error)
        return { error: { code: -32001, message } }
    } finally {
        clearTimeout(timeout)
    }
}
