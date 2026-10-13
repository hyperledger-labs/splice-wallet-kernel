// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { NextFunction, Request, Response } from 'express'
import type { Logger } from 'pino'
import {
    JsonRpcError,
    rpcErrors,
    toHttpErrorCode,
} from '@canton-network/core-rpc-errors'
import {
    ErrorResponse,
    JsonRpcRequest,
    type JsonRpcResponse,
} from '@canton-network/core-types'
import { jsonRpcResponse } from '@canton-network/core-rpc-transport'
import { isJsCantonError } from '@canton-network/core-ledger-client'
import { errorLogLevel } from './errorHandler.js'
import { z } from 'zod'

interface JsonRpcHttpOptions<T> {
    logger: Logger
    controller: T
    paramSchemas: Record<string, z.ZodType>
}

// Bounds the error payload, as issue count, messages (e.g. unrecognized keys)
// and field names (issue paths, which flattenError turns into fieldErrors keys)
// all scale with the input.
const MAX_ISSUES = 10
const MAX_ISSUE_MESSAGE_LENGTH = 200
const MAX_FIELD_NAME_LENGTH = 100

function validateParams(
    schema: z.ZodType,
    params: unknown
): { data: unknown } | { error: ReturnType<typeof rpcErrors.invalidParams> } {
    const result = schema.safeParse(params)
    if (result.success) return { data: result.data }

    const issues = result.error.issues.slice(0, MAX_ISSUES).map((issue) => ({
        ...issue,
        path: issue.path.map((segment) =>
            typeof segment === 'string'
                ? segment.slice(0, MAX_FIELD_NAME_LENGTH)
                : segment
        ),
        message: issue.message.slice(0, MAX_ISSUE_MESSAGE_LENGTH),
    }))
    const { formErrors, fieldErrors } = z.flattenError(new z.ZodError(issues))
    return {
        error: rpcErrors.invalidParams({
            message: 'Invalid params',
            data: { formErrors, fieldErrors },
        }),
    }
}

/**
 * Handles JSON-RPC errors and maps them to HTTP responses.
 * @param error The error that occurred.
 * @param id The JSON-RPC request ID.
 * @param method The name of the JSON-RPC method being called.
 * @returns A tuple containing the HTTP status code and the JSON-RPC response.
 */
export const handleRpcError = (
    error: unknown,
    id: string | number | null,
    method?: string
): [number, JsonRpcResponse] => {
    const genericMessage = method
        ? `Something went wrong while calling ${method}`
        : 'Something went wrong'

    let response: ErrorResponse = {
        error: {
            ...rpcErrors.internal(),
            message: genericMessage,
        },
    }

    if (error instanceof JsonRpcError) {
        response.error = {
            code: error.code,
            message: error.message,
            data: error.data,
        }
        const httpCode = toHttpErrorCode(error.code)
        return [httpCode, jsonRpcResponse(id, response)]
    }

    if (isJsCantonError(error)) {
        response.error = {
            code: rpcErrors.internal().code,
            message: error.cause,
            data: error,
        }
    }

    if (error instanceof Error) {
        response.error.message = error.message
    } else if (typeof error === 'string') {
        response.error.message = error
    } else if (ErrorResponse.safeParse(error).success) {
        response = error as ErrorResponse
    } else if (
        // Check for a Ledger API error format
        typeof error === 'object' &&
        error !== null &&
        'cause' in error &&
        'code' in error
    ) {
        response.error.message = error.cause as string
        response.error.data = error
    }

    const jsonResponse = jsonRpcResponse(id, response)
    return [500, jsonResponse]
}

export const jsonRpcHandler =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <T extends Record<string, (...args: any[]) => any>>({
        controller,
        logger: _logger,
        paramSchemas,
    }: JsonRpcHttpOptions<T>) => {
        const logger = _logger.child({ component: 'json-rpc-http' })

        type Params = Parameters<T[keyof T]>[0]
        type Returns = ReturnType<T[keyof T]>

        return (req: Request, res: Response, next: NextFunction) => {
            if (req.method !== 'POST') {
                return next()
            }

            const parsed = JsonRpcRequest.safeParse(req.body)

            if (!parsed.success) {
                logger.error(
                    {
                        request: req.body,
                        error: parsed.error,
                    },
                    'RPC request: Invalid request format'
                )

                const [status, response] = handleRpcError(
                    rpcErrors.invalidRequest({
                        message: 'Invalid JSON-RPC request format',
                    }),
                    null
                )

                return res.status(status).json(response)
            } else {
                const { method, params, id = null } = parsed.data

                logger.trace(
                    {
                        request: {
                            id,
                            method,
                            params,
                            authContext: req.authContext,
                        },
                    },
                    `RPC request: Method called ${method}`
                )

                const methodFn = Object.hasOwn(controller, method)
                    ? (controller[method] as (params?: Params) => Returns)
                    : undefined
                const schema = Object.hasOwn(paramSchemas, method)
                    ? paramSchemas[method]
                    : undefined
                if (!methodFn || !schema) {
                    const [status, response] = handleRpcError(
                        rpcErrors.methodNotFound({
                            message: `Method ${method} not found`,
                        }),
                        id,
                        method
                    )

                    return res.status(status).json(response)
                }

                // The controller only sees the parsed params, so anything the
                // schema does not describe never reaches it.
                const validated = validateParams(schema, params)
                if ('error' in validated) {
                    const [status, response] = handleRpcError(
                        validated.error,
                        id,
                        method
                    )
                    logger.warn({ response }, 'RPC request: Invalid params')
                    return res.status(status).json(response)
                }

                methodFn(validated.data as Params)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .then((result: any) => {
                        const response = jsonRpcResponse(id, { result })
                        logger.trace(
                            { response },
                            'RPC response: success with response'
                        )
                        res.json(response)
                    })
                    .catch((error: unknown) => {
                        const [status, response] = handleRpcError(
                            error,
                            id,
                            method
                        )

                        // Full error with callstack in logs, sanitized version in response
                        logger[errorLogLevel(error)](
                            { err: error, response },
                            'RPC response: error with response'
                        )
                        res.status(status).json(response)
                    })
            }
        }
    }
