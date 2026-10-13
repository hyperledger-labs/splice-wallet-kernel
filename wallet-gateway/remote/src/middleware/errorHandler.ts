// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { NextFunction, Request, Response } from 'express'
import type { Logger } from 'pino'
import {
    JsonRpcError,
    rpcErrors,
    errorCodes,
    toHttpErrorCode,
} from '@canton-network/core-rpc-errors'
import { jsonRpcResponse } from '@canton-network/core-rpc-transport'
import { isJsCantonError } from '@canton-network/core-ledger-client'

// Mirrors ErrorCategory.asInt from com.digitalasset.base.error (Canton's
// error category taxonomy). Kept in sync with that source rather than
// re-derived, since the numeric values are part of Canton's wire contract.
//
// view source at: https://github.com/digital-asset/canton/blob/2fcea1a4826fd63b6a9ea554c13cb685ae8f2ee2/base/errors/src/main/scala/com/digitalasset/base/error/ErrorCategory.scala#L1
enum CantonErrorCategory {
    TransientServerFailure = 1,
    ContentionOnSharedResources = 2,
    DeadlineExceededRequestStateUnknown = 3,
    SystemInternalAssumptionViolated = 4,
    SecurityAlert = 5,
    AuthInterceptorInvalidAuthenticationCredentials = 6,
    InsufficientPermission = 7,
    InvalidIndependentOfSystemState = 8,
    InvalidGivenCurrentSystemStateOther = 9,
    InvalidGivenCurrentSystemStateResourceExists = 10,
    InvalidGivenCurrentSystemStateResourceMissing = 11,
    InvalidGivenCurrentSystemStateSeekAfterEnd = 12,
    BackgroundProcessDegradationWarning = 13,
    InternalUnsupportedOperation = 14,
}

// Canton error categories that Canton itself does not log at ERROR (see
// ErrorCategory.logLevel in com.digitalasset.base.error). Of the 14 defined
// categories, only SystemInternalAssumptionViolated and
// InternalUnsupportedOperation represent genuine system faults; the rest are
// expected client-, contention-, or state-dependent outcomes that Canton
// logs at INFO or WARN. We collapse Canton's INFO/WARN into our own `info`
// here, and treat anything outside this set (including category numbers we
// don't yet know about) as `error`.
const NON_CRITICAL_CANTON_ERROR_CATEGORIES = new Set<CantonErrorCategory>([
    CantonErrorCategory.TransientServerFailure,
    CantonErrorCategory.ContentionOnSharedResources,
    CantonErrorCategory.DeadlineExceededRequestStateUnknown,
    CantonErrorCategory.SecurityAlert,
    CantonErrorCategory.AuthInterceptorInvalidAuthenticationCredentials,
    CantonErrorCategory.InsufficientPermission,
    CantonErrorCategory.InvalidIndependentOfSystemState,
    CantonErrorCategory.InvalidGivenCurrentSystemStateOther,
    CantonErrorCategory.InvalidGivenCurrentSystemStateResourceExists,
    CantonErrorCategory.InvalidGivenCurrentSystemStateResourceMissing,
    CantonErrorCategory.InvalidGivenCurrentSystemStateSeekAfterEnd,
    CantonErrorCategory.BackgroundProcessDegradationWarning,
    // SystemInternalAssumptionViolated and InternalUnsupportedOperation are
    // excluded - Canton logs both at ERROR as genuine system faults.
])

/**
 * Determines the level an error thrown from an RPC method should be logged
 * at: `info` for an expected, client/business-caused rejection, `error` for
 * an unexpected system fault (including anything we can't classify).
 */
export const errorLogLevel = (error: unknown): 'info' | 'error' => {
    if (error instanceof JsonRpcError) {
        switch (error.code) {
            case errorCodes.rpc.invalidInput:
            case errorCodes.rpc.invalidParams:
            case errorCodes.rpc.invalidRequest:
            case errorCodes.rpc.methodNotFound:
            case errorCodes.rpc.methodNotSupported:
            case errorCodes.rpc.parse:
            case errorCodes.provider.unauthorized:
            case errorCodes.provider.unsupportedMethod:
            case errorCodes.provider.userRejectedRequest:
                return 'info'
            case errorCodes.rpc.internal:
            case errorCodes.rpc.limitExceeded:
            case errorCodes.rpc.resourceNotFound:
            case errorCodes.rpc.resourceUnavailable:
            case errorCodes.rpc.transactionRejected:
            case errorCodes.provider.chainDisconnected:
            case errorCodes.provider.disconnected:
                return 'error'
            default:
                return 'error'
        }
    }

    if (isJsCantonError(error)) {
        return NON_CRITICAL_CANTON_ERROR_CATEGORIES.has(error.errorCategory)
            ? 'info'
            : 'error'
    }

    return 'error'
}

const isPayloadTooLargeError = (err: unknown): boolean => {
    if (typeof err !== 'object' || err === null) {
        return false
    }

    const { status, statusCode } = err as {
        status?: unknown
        statusCode?: unknown
    }

    return status === 413 || statusCode === 413
}

// Catches unhandled errors and prevents internal details like stack trace from reaching end user
export function errorHandler(
    logger: Logger,
    isApiPath: (path: string) => boolean
) {
    return (
        err: unknown,
        req: Request,
        res: Response,
        next: NextFunction
    ): void => {
        // Full error with stack goes to logs only.
        logger.error({ err }, 'Unhandled request error')

        // If the response has already started, we can't safely send an error response.
        if (res.headersSent) {
            next(err)
            return
        }

        if (isPayloadTooLargeError(err)) {
            res.status(413).json({ error: 'Payload Too Large' })
            return
        }

        // jsonRpcHandler already maps controllers errors via handleRpcError.
        // This only runs for errors that escape earlier middlewares (e.g. auth/session checks).
        if (isApiPath(req.path)) {
            const id = req.body?.id ?? null

            if (err instanceof JsonRpcError) {
                res.status(toHttpErrorCode(err.code)).json(
                    jsonRpcResponse(id, {
                        error: { code: err.code, message: err.message },
                    })
                )
                return
            }

            res.status(500).json(
                jsonRpcResponse(id, {
                    error: {
                        code: rpcErrors.internal().code,
                        message: 'Something went wrong',
                    },
                })
            )
            return
        }

        res.status(500).json({ error: 'Internal Server Error' })
    }
}
