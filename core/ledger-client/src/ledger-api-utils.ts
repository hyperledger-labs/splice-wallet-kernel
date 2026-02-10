// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LedgerClient } from './ledger-client.js'

import { Types } from './ledger-client.js'
import { PartyId } from '@canton-network/core-types'

import { Logger } from '@canton-network/core-types'
import { ErrorInfo, RetryInfo } from '@canton-network/core-ledger-proto'

type Completion = Types['Completion']['value']
export type JSContractEntry = Types['JsContractEntry']
export type JsCantonError = Types['JsCantonError']

const COMPLETIONS_LIMIT = '100'
const COMPLETIONS_STREAM_IDLE_TIMEOUT_MS = '1000'

/**
 * Polls the completions endpoint until
 * the completion with the given (userId, commandId, submissionId) is returned.
 * Then returns the updateId, synchronizerId and recordTime of that completion.
 */
export async function awaitCompletion(
    ledgerClient: LedgerClient,
    ledgerEnd: number,
    partyId: PartyId,
    userId: string,
    commandIdOrSubmissionId: string
): Promise<Completion> {
    const responses = await ledgerClient.postWithRetry(
        '/v2/commands/completions',
        {
            userId,
            parties: [partyId],
            beginExclusive: ledgerEnd,
        },
        defaultRetryableOptions,
        {
            query: {
                limit: COMPLETIONS_LIMIT,
                stream_idle_timeout_ms: COMPLETIONS_STREAM_IDLE_TIMEOUT_MS,
            },
        }
    )

    const completions = responses.filter(
        (r) => 'Completion' in r.completionResponse
    )

    const wantedCompletion = responses.find((r) => {
        if ('Completion' in r.completionResponse) {
            const completion = r.completionResponse.Completion.value
            return (
                completion.userId === userId &&
                (completion.commandId === commandIdOrSubmissionId ||
                    completion.submissionId === commandIdOrSubmissionId)
            )
        }
        return false
    })

    if (
        wantedCompletion &&
        'Completion' in wantedCompletion.completionResponse
    ) {
        const completion = wantedCompletion.completionResponse.Completion.value
        const status = completion.status
        if (status && status.code !== 0) {
            // status.code is 0 for success
            throw asGrpcError(status)
        }
        return completion
    } else {
        const lastCompletion = completions[completions.length - 1]
        const newLedgerEnd =
            lastCompletion && 'Completion' in lastCompletion.completionResponse
                ? lastCompletion.completionResponse.Completion.value.offset
                : undefined

        return awaitCompletion(
            ledgerClient,
            newLedgerEnd || ledgerEnd, // !newLedgerEnd implies response was empty
            partyId,
            userId,
            commandIdOrSubmissionId
        )
    }
}

export async function promiseWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
): Promise<T> {
    let timeoutPid: NodeJS.Timeout | null = null
    const timeoutPromise: Promise<T> = new Promise((_resolve, reject) => {
        timeoutPid = setTimeout(() => reject(errorMessage), timeoutMs)
    })

    try {
        return await Promise.race([promise, timeoutPromise])
    } finally {
        if (timeoutPid) {
            clearTimeout(timeoutPid)
        }
    }
}

export type retryableOptions = {
    retries: number
    delayMs: number
    cantonErrorKeys: string[]
}
export const defaultRetryableOptions: retryableOptions = {
    retries: 5,
    delayMs: 3000,
    cantonErrorKeys: [
        'SEQUENCER_REQUEST_FAILED',
        'SEQUENCER_BACKPRESSURE',
        'SUBMISSION_ALREADY_IN_FLIGHT',
        'LOCAL_VERDICT_TIMEOUT',
        'NOT_SEQUENCED_TIMEOUT',
        'NO_VIEW_WITH_VALID_RECIPIENTS',
    ],
}

export async function retryable<T>(
    fn: () => Promise<T>,
    retryableOptions: retryableOptions,
    logger?: Logger
): Promise<T> {
    for (let attempts = 1; attempts <= retryableOptions.retries; attempts++) {
        try {
            return await fn()
        } catch (err: unknown) {
            const grpcError = asGrpcError(err)
            const message: string = grpcError.message
            const shouldRetry =
                retryableOptions.cantonErrorKeys.length === 0 ||
                retryableOptions.cantonErrorKeys.some((key) =>
                    message.includes(key)
                )
            if (attempts < retryableOptions.retries && shouldRetry) {
                logger?.warn(
                    `Caught retryiable error: ${message}. Retrying attempt ${attempts} of ${retryableOptions.retries}...`
                )
                await new Promise((res) =>
                    setTimeout(res, retryableOptions.delayMs)
                )
                // continue to next attempt
            } else {
                throw grpcError
            }
        }
    }
    throw new Error('retryable: Exceeded maximum retries without throwing.')
}

// Helper for differentiating ledger errors from others and satisfying TS when checking error properties
export const isJsCantonError = (e: unknown): e is JsCantonError =>
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    'cause' in e &&
    'errorCategory' in e

export const asJsCantonError = (e: unknown): JsCantonError => {
    if (isJsCantonError(e)) {
        return e
    } else {
        throw e
    }
}

export const asGrpcError = (
    e: unknown
): {
    code: number
    message: string
    errorInfo: ErrorInfo | undefined
    retryInfo: RetryInfo | undefined
} => {
    let errorInfo: ErrorInfo | undefined = undefined
    let retryInfo: RetryInfo | undefined = undefined
    let code = 500
    let message = (e as Error)?.message || ''
    if (typeof e === 'object' && e !== null && 'cause' in e) {
        message = e.cause as string
    } else if (typeof e === 'object' && e !== null && 'message' in e) {
        message = e.message as string
    }
    if (
        typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        'message' in e &&
        'details' in e &&
        Array.isArray(e.details)
    ) {
        code = e.code as number
        message = e.message as string
        for (const detail of e.details) {
            if (
                detail.typeUrl === 'type.googleapis.com/google.rpc.ErrorInfo' &&
                typeof detail.value === 'string'
            ) {
                try {
                    errorInfo = ErrorInfo.fromBinary(
                        Buffer.from(detail.value, 'base64')
                    )
                } catch {
                    //if parsing fails, we skip adding ErrorInfo
                }
            } else if (
                detail.typeUrl === 'type.googleapis.com/google.rpc.RetryInfo' &&
                typeof detail.value === 'string'
            ) {
                try {
                    retryInfo = RetryInfo.fromBinary(
                        Buffer.from(detail.value, 'base64')
                    )
                } catch {
                    //if parsing fails, we skip adding RetryInfo
                }
            }
        }
    } else {
        // Not a gRPC error, rethrow
        throw e
    }
    // Fallback: just return the error message
    return { code: code, message: message, errorInfo, retryInfo }
}
