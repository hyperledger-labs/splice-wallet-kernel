import { NextFunction, Request, Response } from 'express'
import { Logger } from 'pino'
import { type } from 'arktype'
import { rpcErrors } from '@metamask/rpc-errors'

interface JsonRpcHttpOptions<T> {
    logger: Logger
    controller: T
}

const JsonRpcMeta = type({
    jsonrpc: "'2.0'", // only support JSON-RPC 2.0
    id: 'string | number | null',
})

const JsonRpcRequest = type({
    '...': JsonRpcMeta,
    method: 'string',
    'params?': 'object',
})

const JsonRpcPayload = type({ result: 'object' }).or({
    error: {
        code: 'number',
        message: 'string',
        'data?': 'object | string | number | false | true | undefined | null',
    },
})
type JsonRpcPayload = typeof JsonRpcPayload.infer

const JsonRpcResponse = type([JsonRpcMeta, '&', JsonRpcPayload])
type JsonRpcResponse = typeof JsonRpcResponse.infer

const toRpcResponse = (
    id: string | number | null,
    payload: JsonRpcPayload
): JsonRpcResponse => {
    if ('result' in payload) {
        return {
            jsonrpc: '2.0',
            id, // id should be set based on the request context
            result: payload.result,
        }
    } else {
        return {
            jsonrpc: '2.0',
            id, // id should be set based on the request context
            error: {
                code: payload.error.code,
                message: payload.error.message,
                data: payload.error.data,
            },
        }
    }
}

export const jsonRpcHttpMiddleware =
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

            // validate request body schema
            const body = JsonRpcRequest(req.body)

            if (body instanceof type.errors) {
                res.status(400).json(
                    toRpcResponse(null, {
                        error: rpcErrors.invalidRequest({
                            message: 'Invalid JSON-RPC request format',
                        }),
                    })
                )
            } else {
                const { method, params, id } = body

                logger.debug(
                    `Received RPC request: method=${body.method}, params=${JSON.stringify(body.params)}`
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .catch((error: any) => {
                        logger.error(`Error in method ${method}:`, error)
                        res.status(500).json(
                            toRpcResponse(null, {
                                error: rpcErrors.internal({
                                    message: `Error in method ${method}: ${error.message}`,
                                }),
                            })
                        )
                    })
            }
        }
    }
