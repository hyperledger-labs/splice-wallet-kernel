// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
    asGrpcError,
    asJsCantonError,
    awaitCompletion,
    defaultRetryableOptions,
    isJsCantonError,
    retryable,
} from './ledger-api-utils.js'
import type { LedgerClient } from './ledger-client.js'
import { grpcError, mockLogger } from './test-utils.js'

const cantonError = { code: 'NOT_FOUND', cause: 'missing', errorCategory: 1 }

function completion(
    commandId: string,
    offset: number,
    status: { code: number; message?: string } = { code: 0 }
) {
    return {
        completionResponse: {
            Completion: {
                value: {
                    userId: 'alice',
                    commandId,
                    submissionId: commandId,
                    offset,
                    status,
                },
            },
        },
    }
}

describe('ledger-api-utils', () => {
    it('identifies canton errors', () => {
        expect(isJsCantonError(cantonError)).toBe(true)
        expect(isJsCantonError(new Error('not canton error'))).toBe(false)
    })

    it('asJsCantonError returns or rethrows', () => {
        expect(asJsCantonError(cantonError)).toBe(cantonError)
        expect(() => asJsCantonError(new Error('not canton error'))).toThrow()
    })

    it('asGrpcError parses grpc shape and rethrows others', () => {
        expect(asGrpcError(grpcError('request failed'))).toMatchObject({
            code: 9,
            message: 'request failed',
        })
        expect(() => asGrpcError(new Error('not grpc'))).toThrow()
    })

    describe('retryable', () => {
        beforeEach(() => vi.useFakeTimers())
        afterEach(() => vi.useRealTimers())

        it('retries matching errors', async () => {
            let attempts = 0
            const fn = vi.fn(async () => {
                attempts++
                if (attempts === 1) throw grpcError('SEQUENCER_REQUEST_FAILED')
                return 'ok'
            })

            const result = retryable(
                fn,
                {
                    retries: 2,
                    delayMs: 1000,
                    cantonErrorKeys: ['SEQUENCER_REQUEST_FAILED'],
                },
                mockLogger
            )
            await vi.advanceTimersByTimeAsync(1000)

            await expect(result).resolves.toBe('ok')
            expect(fn).toHaveBeenCalledTimes(2)
        })

        it('does not retry non-matching errors', async () => {
            const fn = vi.fn(async () => {
                throw grpcError('INVALID_ARGUMENT')
            })

            await expect(
                retryable(fn, defaultRetryableOptions, mockLogger)
            ).rejects.toMatchObject({ message: 'INVALID_ARGUMENT' })
        })
    })

    describe('awaitCompletion', () => {
        it('returns matching completion', async () => {
            const client = {
                postWithRetry: vi
                    .fn()
                    .mockResolvedValueOnce([completion('cmd-1', 42)]),
            } as unknown as LedgerClient

            const result = await awaitCompletion(
                client,
                10,
                'alice::namespace',
                'alice',
                'cmd-1'
            )
            expect(result.commandId).toBe('cmd-1')
        })

        it('throws on failure status', async () => {
            const client = {
                postWithRetry: vi
                    .fn()
                    .mockResolvedValueOnce([
                        completion('cmd-1', 42, { code: 9, message: 'failed' }),
                    ]),
            } as unknown as LedgerClient

            await expect(
                awaitCompletion(
                    client,
                    10,
                    'alice::namespace',
                    'alice',
                    'cmd-1'
                )
            ).rejects.toMatchObject({ code: 9, message: 'failed' })
        })

        it('gives up after maxAttempts polls without a match', async () => {
            const client = {
                postWithRetry: vi.fn().mockResolvedValue([]),
            } as unknown as LedgerClient

            await expect(
                awaitCompletion(
                    client,
                    10,
                    'alice::namespace',
                    'alice',
                    'cmd-1',
                    3
                )
            ).rejects.toThrow('Completion for cmd-1 not found')
            expect(client.postWithRetry).toHaveBeenCalledTimes(3)
        })

        it('polls with updated ledger end', async () => {
            const client = {
                postWithRetry: vi
                    .fn()
                    .mockResolvedValueOnce([completion('other-cmd', 20)])
                    .mockResolvedValueOnce([completion('cmd-1', 21)]),
            } as unknown as LedgerClient

            const result = await awaitCompletion(
                client,
                10,
                'alice::namespace',
                'alice',
                'cmd-1'
            )
            expect(result.commandId).toBe('cmd-1')
            expect(client.postWithRetry).toHaveBeenCalledTimes(2)
        })
    })
})
