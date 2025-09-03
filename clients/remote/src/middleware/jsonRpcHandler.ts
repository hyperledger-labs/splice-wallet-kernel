// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { NextFunction, Request, Response } from 'express'
import { Logger } from 'pino'
import { rpcErrors } from '@metamask/rpc-errors'
import {
    ErrorResponse,
    JsonRpcRequest,
    jsonRpcResponse,
} from '@canton-network/core-types'

interface JsonRpcHttpOptions<T> {
    logger: Logger
    controller: T
}

export const jsonRpcHandler =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <T extends Record<string, (...args: any[]) => any>>({
        controller,
        logger: _logger,
    }: JsonRpcHttpOptions<T>) => {
        const logger = _logger.child({ component: 'json-rpc-http' })

        type Params = Parameters<T[keyof T]>[0]
        type Returns = ReturnType<T[keyof T]>

        return (req: Request, res: Response, next: NextFunction) => {
            if (req.method !== 'POST') {
                next()
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
                res.status(400).json(
                    jsonRpcResponse(null, {
                        error: rpcErrors.invalidRequest({
                            message: 'Invalid JSON-RPC request format',
                        }),
                    })
                )
            } else {
                const { method, params, id = null } = parsed.data

                logger.debug(
                    {
                        request: {
                            id: id,
                            method: method,
                            params: params,
                            authContext: req.authContext,
                        },
                    },
                    `RPC request: ${method}`
                )

                const methodFn = controller[method as keyof T] as (
                    params?: Params
                ) => Returns
                if (!methodFn) {
                    const response = jsonRpcResponse(id, {
                        error: rpcErrors.methodNotFound({
                            message: `Method ${method} not found`,
                        }),
                    })
                    logger.error(response, `RPC response`)
                    res.status(404).json(response)
                }

                // TODO: validate params match the expected schema for the method
                methodFn(params as Params)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .then((result: any) => {
                        const response = jsonRpcResponse(id, { result })
                        logger.debug(response, 'RPC response')
                        res.json(response)
                    })
                    .catch((error: unknown) => {
                        let response: ErrorResponse = {
                            error: {
                                ...rpcErrors.internal(),
                                message: `Something went wrong while calling ${method}`,
                                data: undefined,
                            },
                        }

                        if (error instanceof Error) {
                            response.error.message = error.message

                            if (error.message === 'User is not connected') {
                                response.error.code =
                                    rpcErrors.invalidRequest().code
                                res.status(401).json(
                                    jsonRpcResponse(id, response)
                                )
                                return
                            }
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
                        logger.error(jsonResponse, 'RPC response')
                        res.status(500).json(jsonResponse)
                    })
            }
        }
    }
