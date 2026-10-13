// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'
import { pino } from 'pino'
import { sink } from 'pino-test'
import { providerErrors, rpcErrors } from '@canton-network/core-rpc-errors'
import { errorHandler, errorLogLevel } from './errorHandler.js'

describe('errorHandler', () => {
    const logger = pino({ level: 'silent' }, sink())
    const isApiPath = (path: string) => path.startsWith('/api/')

    let next: NextFunction
    let status: ReturnType<typeof vi.fn>
    let json: ReturnType<typeof vi.fn>

    beforeEach(() => {
        next = vi.fn() as NextFunction
        status = vi.fn().mockReturnThis()
        json = vi.fn()
    })

    function makeReq(partial: Partial<Request> = {}): Request {
        return {
            path: '/api/v0/user',
            body: { id: 1 },
            ...partial,
        } as Request
    }

    function makeRes(headersSent = false): Response {
        return { status, json, headersSent } as unknown as Response
    }

    it('maps a JsonRpcError to its HTTP status and keeps the message', () => {
        const err = providerErrors.unauthorized({
            message: 'User is not connected',
        })

        errorHandler(logger, isApiPath)(err, makeReq(), makeRes(), next)

        expect(status).toHaveBeenCalledWith(401)
        expect(json).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            id: 1,
            error: {
                code: providerErrors.unauthorized().code,
                message: 'User is not connected',
            },
        })
    })

    it('replaces an unexpected error with a generic JSON-RPC 500 on API paths', () => {
        const err = new Error('connect ECONNREFUSED 127.0.0.1:5432')

        errorHandler(logger, isApiPath)(err, makeReq(), makeRes(), next)

        expect(status).toHaveBeenCalledWith(500)
        expect(json).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            id: 1,
            error: {
                code: rpcErrors.internal().code,
                message: 'Something went wrong',
            },
        })
    })

    it('never sends the stack trace to the client', () => {
        const err = new Error('internal detail')

        errorHandler(logger, isApiPath)(err, makeReq(), makeRes(), next)

        const body = JSON.stringify(json.mock.calls[0][0])
        expect(body).not.toContain('internal detail')
        expect(body).not.toContain('at ') // stack trace
    })

    it('keeps the 413 from express.json() for err.status', () => {
        const err = Object.assign(new Error('request too large'), {
            status: 413,
        })

        errorHandler(logger, isApiPath)(err, makeReq(), makeRes(), next)

        expect(status).toHaveBeenCalledWith(413)
        expect(json).toHaveBeenCalledWith({ error: 'Payload Too Large' })
    })

    it('keeps the 413 from express.json() for err.statusCode', () => {
        const err = Object.assign(new Error('request too large'), {
            statusCode: 413,
        })

        errorHandler(logger, isApiPath)(err, makeReq(), makeRes(), next)

        expect(status).toHaveBeenCalledWith(413)
        expect(json).toHaveBeenCalledWith({ error: 'Payload Too Large' })
    })

    it('leaves an error without a 413 status as a generic 500', () => {
        const err = Object.assign(new Error('not a 413 error'), {
            status: 404,
        })

        errorHandler(logger, isApiPath)(err, makeReq(), makeRes(), next)

        expect(status).toHaveBeenCalledWith(500)
    })

    it('returns a generic error body for non-API paths', () => {
        const req = makeReq({ path: '/login' })

        errorHandler(logger, isApiPath)(
            new Error('internal detail'),
            req,
            makeRes(),
            next
        )

        expect(status).toHaveBeenCalledWith(500)
        expect(json).toHaveBeenCalledWith({ error: 'Internal Server Error' })
    })

    it('delegates to express when the response has already started', () => {
        const err = new Error(
            'error that some middleware started res on, but still passed error down'
        )

        errorHandler(logger, isApiPath)(err, makeReq(), makeRes(true), next)

        expect(next).toHaveBeenCalledWith(err)
        expect(status).not.toHaveBeenCalled()
        expect(json).not.toHaveBeenCalled()
    })
})

describe('errorLogLevel', () => {
    function makeJsCantonError(errorCategory: number) {
        return {
            code: 'DAML_FAILURE',
            cause: 'some ledger rejection',
            errorCategory,
        }
    }

    it('logs client-caused JsonRpcErrors (HTTP < 500) at info', () => {
        const err = rpcErrors.invalidParams({ message: 'bad params' })

        expect(errorLogLevel(err)).toBe('info')
    })

    it('logs server-caused JsonRpcErrors (HTTP 500) at error', () => {
        const err = rpcErrors.internal({ message: 'boom' })

        expect(errorLogLevel(err)).toBe('error')
    })

    it('logs a JsCantonError in a non-alerting Canton category at info', () => {
        // 9 = InvalidGivenCurrentSystemStateOther, e.g. a failed Daml
        // `requirement`/assertion - an expected business rejection.
        const err = makeJsCantonError(9)

        expect(errorLogLevel(err)).toBe('info')
    })

    it('logs a JsCantonError in a system-fault Canton category at error', () => {
        // 4 = SystemInternalAssumptionViolated - a genuine internal bug.
        const err = makeJsCantonError(4)

        expect(errorLogLevel(err)).toBe('error')
    })

    it('logs a JsCantonError with an unrecognized category at error', () => {
        const err = makeJsCantonError(999)

        expect(errorLogLevel(err)).toBe('error')
    })

    it('logs a plain Error at error', () => {
        expect(errorLogLevel(new Error('boom'))).toBe('error')
    })

    it('logs an unrecognized error shape at error', () => {
        expect(errorLogLevel({ foo: 'bar' })).toBe('error')
    })
})
