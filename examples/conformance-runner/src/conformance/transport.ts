// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface JsonRpcError {
    code: number
    message: string
}

export interface JsonRpcResponse {
    result?: unknown
    error?: JsonRpcError
}

export interface ConformanceTransport {
    request(method: string, params: unknown): Promise<JsonRpcResponse>
    requestInvalidEnvelope(): Promise<JsonRpcResponse | null>
    close(): Promise<void>
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise
    return new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => {
            reject(new Error(`Timeout after ${timeoutMs}ms`))
        }, timeoutMs)
        promise.then(
            (v) => {
                clearTimeout(t)
                resolve(v)
            },
            (e) => {
                clearTimeout(t)
                reject(e)
            }
        )
    })
}

function normalizeUnknownError(error: unknown): JsonRpcError {
    if (typeof error === 'object' && error !== null) {
        // Many of our transports throw { error: { code, message, ... } }.
        const nested = (error as { error?: unknown }).error
        if (typeof nested === 'object' && nested !== null) {
            const maybeCode = (nested as { code?: unknown }).code
            const maybeMessage = (nested as { message?: unknown }).message
            const maybeData = (nested as { data?: unknown }).data
            if (
                typeof maybeCode === 'number' &&
                typeof maybeMessage === 'string'
            ) {
                if (typeof maybeData === 'string' && maybeData.trim()) {
                    return {
                        code: maybeCode,
                        message: `${maybeMessage}\n\n${maybeData}`,
                    }
                }
                return { code: maybeCode, message: maybeMessage }
            }
            if (typeof maybeMessage === 'string') {
                return { code: maybeCode as number, message: maybeMessage }
            }
        }

        const maybeCode = (error as { code?: unknown }).code
        const maybeMessage = (error as { message?: unknown }).message
        if (typeof maybeCode === 'number' && typeof maybeMessage === 'string') {
            return { code: maybeCode, message: maybeMessage }
        }
        if (typeof maybeMessage === 'string') {
            return { code: maybeCode as number, message: maybeMessage }
        }

        // Last resort: stringify the object so users can debug (avoid "[object Object]").
        try {
            return { code: maybeCode as number, message: JSON.stringify(error) }
        } catch {
            // ignore
        }
    }
    return {
        code: (error as { code?: number })?.code ?? -32001,
        message: error instanceof Error ? error.message : String(error),
    }
}

export type ConnectedProvider = {
    request(args: { method: string; params?: unknown }): Promise<unknown>
}

export function createConnectedProviderTransport(
    provider: ConnectedProvider,
    options?: { timeoutMs?: number | undefined }
): ConformanceTransport {
    const timeoutMs = options?.timeoutMs ?? 15000
    return {
        async request(
            method: string,
            params: unknown
        ): Promise<JsonRpcResponse> {
            try {
                const result = await withTimeout(
                    provider.request({ method, params }),
                    timeoutMs
                )
                return { result }
            } catch (error) {
                return { error: normalizeUnknownError(error) }
            }
        },
        async requestInvalidEnvelope(): Promise<JsonRpcResponse | null> {
            // Connected-provider API does not allow sending raw invalid JSON-RPC.
            return null
        },
        async close(): Promise<void> {},
    }
}
