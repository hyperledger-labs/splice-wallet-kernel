import { NextFunction, Request, Response } from 'express'
import { Logger } from 'pino'
import { rpcErrors } from '@metamask/rpc-errors'
import {
    ErrorResponse,
    JsonRpcRequest,
    JsonRpcResponse,
    ResponsePayload,
} from 'core-types'

interface JsonRpcHttpOptions<T> {
    logger: Logger
    controller: T
}

const toRpcResponse = (
    id: string | number | null,
    payload: ResponsePayload
): JsonRpcResponse => {
    return {
        ...payload,
        jsonrpc: '2.0',
        id, // id should be set based on the request context
    }
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
                res.status(400).json(
                    toRpcResponse(null, {
                        error: rpcErrors.invalidRequest({
                            message: 'Invalid JSON-RPC request format',
                        }),
                    })
                )
            } else {
                const { method, params, id = null } = parsed.data

                logger.debug(
                    `Received RPC request: method=${method}, params=${JSON.stringify(params)}, authContext=${JSON.stringify(req.authContext)}`
                )

                const methodFn = controller[method as keyof T] as (
                    params?: Params
                ) => Returns
                if (!methodFn) {
                    logger.error(`Method ${method} not found`)
                    res.status(404).json(
                        toRpcResponse(null, {
                            error: rpcErrors.methodNotFound({
                                message: `Method ${method} not found`,
                            }),
                        })
                    )
                }

                // TODO: validate params match the expected schema for the method
                methodFn(params as Params)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .then((result: any) => {
                        res.json(toRpcResponse(id, { result }))
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
                                    toRpcResponse(null, response)
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

                        res.status(500).json(toRpcResponse(null, response))
                    })
            }
        }
    }
