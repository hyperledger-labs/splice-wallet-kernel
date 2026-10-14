// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'
import { pino } from 'pino'
import { sink } from 'pino-test'
import type { JsonRpcResponse } from '@canton-network/core-types'
import { rpcErrors, toHttpErrorCode } from '@canton-network/core-rpc-errors'
import { handleRpcError, jsonRpcHandler } from './jsonRpcHandler.js'
import { paramSchemas as dappParamSchemas } from '../dapp-api/rpc-gen/schemas.js'
import { z } from 'zod'

function errorPayload(body: JsonRpcResponse) {
    if (!('error' in body)) {
        throw new Error('expected JSON-RPC error response')
    }
    return body.error
}

async function waitForRpcResponse(res: Response) {
    const json = res.json as ReturnType<typeof vi.fn>
    await vi.waitUntil(() => json.mock.calls.length > 0)
}

describe('jsonRpcHandler', () => {
    const logger = pino({ level: 'silent' }, sink())

    type TestController = {
        resolve: (params?: unknown) => Promise<string>
        reject: (params?: unknown) => Promise<never>
        rpcError: (params?: unknown) => Promise<never>
    }

    const resolve = vi.fn(async () => 'response')
    const reject = vi.fn(async () => {
        throw new Error('error')
    })
    const rpcError = vi.fn(async () => {
        throw rpcErrors.invalidParams({ message: 'bad params' })
    })

    beforeEach(() => {
        resolve.mockClear()
        reject.mockClear()
        rpcError.mockClear()
    })

    function makeHandler() {
        return jsonRpcHandler<TestController>({
            controller: { resolve, reject, rpcError },
            logger,
            paramSchemas: {
                resolve: z.unknown(),
                reject: z.unknown(),
                rpcError: z.unknown(),
            },
        })
    }

    function makeRes() {
        const res = {
            status: vi.fn(),
            json: vi.fn(),
        }

        // Express response methods are chainable, like `res.status(500).json(body)`
        // Make the mocked status() return this fake res object so .json() can be called after it.
        res.status.mockReturnValue(res)

        return res as unknown as Response
    }

    describe('param validation', () => {
        it.each([
            [undefined, true],
            [[], true],
            [{}, true],
            [[1], false],
            [{ extra: true }, false],
        ])(
            'generated schema for a method without params accepts %j: %s',
            (params, valid) => {
                expect(dappParamSchemas.status!.safeParse(params).success).toBe(
                    valid
                )
            }
        )

        const paramSchemas = {
            resolve: z.strictObject({ message: z.string() }),
        }

        async function call(
            params: unknown,
            schemas: Record<string, z.ZodType> = paramSchemas
        ) {
            const res = makeRes()
            jsonRpcHandler<TestController>({
                controller: { resolve, reject, rpcError },
                logger,
                paramSchemas: schemas,
            })(
                {
                    method: 'POST',
                    body: { jsonrpc: '2.0', id: 1, method: 'resolve', params },
                } as Request,
                res,
                vi.fn()
            )
            await waitForRpcResponse(res)
            return res
        }

        it.each([
            ['missing params', undefined],
            ['a missing required property', {}],
            ['a wrongly typed property', { message: 42 }],
            ['an unknown property', { message: 'hi', extra: true }],
        ])('rejects %s with InvalidParams', async (_, params) => {
            const res = await call(params)

            expect(resolve).not.toHaveBeenCalled()
            expect(res.status).toHaveBeenCalledWith(
                toHttpErrorCode(rpcErrors.invalidParams().code)
            )
            expect(
                errorPayload(
                    (res.json as ReturnType<typeof vi.fn>).mock
                        .calls[0]![0] as JsonRpcResponse
                ).code
            ).toBe(rpcErrors.invalidParams().code)
        })

        it('passes valid params to the controller', async () => {
            await call({ message: 'hi' })

            expect(resolve).toHaveBeenCalledWith({ message: 'hi' })
        })

        it('passes the parsed params, without properties the schema does not describe', async () => {
            await call(
                { message: 'hi', extra: true },
                { resolve: z.object({ message: z.string() }) }
            )

            expect(resolve).toHaveBeenCalledWith({ message: 'hi' })
        })

        it('reports flattened field and form errors', async () => {
            const res = await call({ message: 42, extra: true })

            const error = errorPayload(
                (res.json as ReturnType<typeof vi.fn>).mock
                    .calls[0]![0] as JsonRpcResponse
            )
            expect(error.message).toBe('Invalid params')
            expect(error.data).toEqual({
                formErrors: [expect.stringContaining('"extra"')],
                fieldErrors: { message: [expect.any(String)] },
            })
        })

        it('bounds the error payload for large invalid inputs', async () => {
            const res = await call(
                Object.fromEntries(
                    Array.from({ length: 1000 }, (_, i) => [`key${i}`, i])
                ),
                {
                    resolve: z.record(z.string(), z.string()),
                }
            )

            const { data } = errorPayload(
                (res.json as ReturnType<typeof vi.fn>).mock
                    .calls[0]![0] as JsonRpcResponse
            )
            expect(
                Object.keys((data as { fieldErrors: object }).fieldErrors)
            ).toHaveLength(10)
        })

        it('truncates long issue messages', async () => {
            const res = await call({
                message: 'hi',
                ['x'.repeat(10_000)]: true,
            })

            const { data } = errorPayload(
                (res.json as ReturnType<typeof vi.fn>).mock
                    .calls[0]![0] as JsonRpcResponse
            )
            const [formError] = (data as { formErrors: string[] }).formErrors
            expect(formError!.length).toBe(200)
        })

        it('truncates long field names of the generated schema, which rejects unknown properties that are not null', async () => {
            const res = await call(
                { message: 'hi', ['x'.repeat(10_000)]: true },
                { resolve: dappParamSchemas.signMessage! }
            )

            const { data } = errorPayload(
                (res.json as ReturnType<typeof vi.fn>).mock
                    .calls[0]![0] as JsonRpcResponse
            )
            expect(
                Object.keys((data as { fieldErrors: object }).fieldErrors)
            ).toEqual(['x'.repeat(100)])
        })

        it('passes missing params through when the param is optional', async () => {
            await call(undefined, {
                resolve: paramSchemas.resolve.optional(),
            })

            expect(resolve).toHaveBeenCalledWith(undefined)
        })

        it('rejects a controller method without a schema as not found', async () => {
            const res = await call({ message: 'hi' }, {})

            expect(resolve).not.toHaveBeenCalled()
            expect(
                errorPayload(
                    (res.json as ReturnType<typeof vi.fn>).mock
                        .calls[0]![0] as JsonRpcResponse
                ).code
            ).toBe(rpcErrors.methodNotFound().code)
        })
    })

    it('delegates to next() if method is not POST', () => {
        const handler = makeHandler()
        const next = vi.fn()
        const res = makeRes()
        const req = {
            method: 'GET',
            body: {},
        } as Request

        handler(req, res, next)

        expect(next).toHaveBeenCalledOnce()
        expect(res.status).not.toHaveBeenCalled()
    })

    it('responds with invalid request when body is not valid JSON-RPC 2.0', async () => {
        const handler = makeHandler()
        const next = vi.fn()
        const res = makeRes()
        const req = {
            method: 'POST',
            body: { jsonrpc: '1.0', method: 'resolve', id: 1 },
        } as Request

        handler(req, res, next)
        await waitForRpcResponse(res)

        expect(next).not.toHaveBeenCalled()
        expect(res.status).toHaveBeenCalled()
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                jsonrpc: '2.0',
                id: null,
                error: expect.objectContaining({
                    code: expect.any(Number),
                }),
            })
        )
    })

    it('returns method not found when controller has no such method', async () => {
        const handler = makeHandler()
        const next = vi.fn()
        const res = makeRes()
        const req = {
            method: 'POST',
            body: {
                jsonrpc: '2.0',
                id: 42,
                method: 'missing',
                params: [],
            },
        } as Request

        handler(req, res, next)
        await waitForRpcResponse(res)

        expect(res.status).toHaveBeenCalled()
        const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(payload.id).toBe(42)
        expect(payload.error.message).toContain('missing')
    })

    it('returns JSON-RPC success when the method resolves', async () => {
        const handler = makeHandler()
        const next = vi.fn()
        const res = makeRes()
        const req = {
            method: 'POST',
            body: {
                jsonrpc: '2.0',
                id: 7,
                method: 'resolve',
                params: { x: 1 },
            },
            authContext: { userId: 'u', accessToken: 't' },
        } as Request

        handler(req, res, next)
        await waitForRpcResponse(res)

        expect(resolve).toHaveBeenCalledWith({ x: 1 })
        expect(res.json).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            id: 7,
            result: 'response',
        })
    })

    it('maps thrown Error to JSON-RPC error with HTTP 500', async () => {
        const handler = makeHandler()
        const next = vi.fn()
        const res = makeRes()
        const req = {
            method: 'POST',
            body: {
                jsonrpc: '2.0',
                id: 'rid',
                method: 'reject',
                params: [],
            },
        } as Request

        handler(req, res, next)
        await waitForRpcResponse(res)

        expect(reject).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(500)
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                jsonrpc: '2.0',
                id: 'rid',
                error: expect.objectContaining({
                    message: 'error',
                }),
            })
        )
    })

    it('maps JsonRpcError to the corresponding HTTP status', async () => {
        const handler = makeHandler()
        const next = vi.fn()
        const res = makeRes()
        const req = {
            method: 'POST',
            body: {
                jsonrpc: '2.0',
                id: 0,
                method: 'rpcError',
                params: [],
            },
        } as Request

        handler(req, res, next)
        await waitForRpcResponse(res)

        expect(rpcError).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(
            toHttpErrorCode(rpcErrors.invalidParams().code)
        )
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                jsonrpc: '2.0',
                id: 0,
                error: expect.objectContaining({
                    message: 'bad params',
                }),
            })
        )
    })
})
describe('handleRpcError', () => {
    const logger = pino({ level: 'silent' }, sink())
    const errorLog = vi.spyOn(logger, 'error')

    it('maps JsonRpcError to HTTP status from toHttpErrorCode and does not log RPC response as error', () => {
        const err = rpcErrors.invalidParams({ message: 'bad' })
        const [status, body] = handleRpcError(err, 99, 'whateverMethod')

        expect(status).toBe(toHttpErrorCode(err.code))
        expect(status).toBe(400)
        expect(body).toEqual({
            jsonrpc: '2.0',
            id: 99,
            error: { code: err.code, message: 'bad' },
        })
        expect(errorLog).not.toHaveBeenCalled()
    })

    it('keeps the JsonRpcError message once the response is serialised', () => {
        const err = rpcErrors.invalidParams({ message: 'error description' })
        const [, body] = handleRpcError(err, 99)

        expect(JSON.parse(JSON.stringify(body))).toMatchObject({
            error: { code: err.code, message: 'error description' },
        })
    })

    it('forwards data that was deliberately attached to a JsonRpcError', () => {
        const err = rpcErrors.invalidParams({
            message: 'bad',
            data: { field: 'value' },
        })
        const [, body] = handleRpcError(err, 1)

        expect(errorPayload(body)).toMatchObject({ data: { field: 'value' } })
    })

    it('forwards the Error message but not the error object itself', () => {
        const [status, body] = handleRpcError(
            new Error('some error'),
            'id',
            'submit'
        )

        expect(status).toBe(500)
        expect(body).toEqual({
            jsonrpc: '2.0',
            id: 'id',
            error: {
                code: rpcErrors.internal().code,
                message: 'some error',
            },
        })
    })

    it('does not leak enumerable properties of runtime errors', () => {
        const dbError = Object.assign(new Error('connect ECONNREFUSED'), {
            code: 'ECONNREFUSED',
            address: '127.0.0.1',
            port: 5432,
        })

        const [, body] = handleRpcError(dbError, 1, 'listWallets')

        expect(errorPayload(body)).not.toHaveProperty('data')
        expect(JSON.stringify(body)).not.toContain('5432')
    })

    it('uses generic message when method name is omitted', () => {
        const [status, body] = handleRpcError(new Error('x'), null)

        expect(status).toBe(500)
        expect(errorPayload(body)).toMatchObject({
            message: 'x',
        })
    })

    it('maps string errors to the error message', () => {
        const [status, body] = handleRpcError('plain', 0)

        expect(status).toBe(500)
        expect(errorPayload(body)).toMatchObject({
            message: 'plain',
        })
    })

    it('accepts a full ErrorResponse object when safeParse succeeds', () => {
        const custom = {
            error: {
                code: -32000,
                message: 'from client',
                data: { hint: 1 },
            },
        }
        const [status, body] = handleRpcError(custom, 3)

        expect(status).toBe(500)
        expect(body).toEqual({
            jsonrpc: '2.0',
            id: 3,
            error: custom.error,
        })
    })

    it('maps JsCantonError objects to internal code with cause as message', () => {
        const ledgerErr = {
            code: 'CODE',
            cause: 'something went wrong',
        }
        const [status, body] = handleRpcError(ledgerErr, null)

        expect(status).toBe(500)
        expect(errorPayload(body)).toMatchObject({
            code: rpcErrors.internal().code,
            message: 'something went wrong',
            data: ledgerErr,
        })
    })

    it('falls back to generic internal error for unknown payloads', () => {
        const [status, body] = handleRpcError({ foo: 'bar' }, 2, 'wrongMethod')

        expect(status).toBe(500)
        expect(errorPayload(body)).toEqual({
            code: rpcErrors.internal().code,
            message: 'Something went wrong while calling wrongMethod',
        })
    })
})
