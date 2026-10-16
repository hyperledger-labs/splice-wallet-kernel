// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { jwtAuth } from './jwtAuth.js'
import { providerErrors, rpcErrors } from '@canton-network/core-rpc-errors'
import { IdpUnavailableError } from '@canton-network/core-wallet-auth'
import { pino } from 'pino'
import { sink } from 'pino-test'

describe('jwtAuth', () => {
    const verifyToken = vi.fn()
    const authService = { verifyToken }
    const logger = pino({ level: 'silent' }, sink())

    let next: NextFunction
    let status: ReturnType<typeof vi.fn>
    let json: ReturnType<typeof vi.fn>

    beforeEach(() => {
        verifyToken.mockReset()
        next = vi.fn() as NextFunction
        status = vi.fn().mockReturnThis()
        json = vi.fn()
    })

    function makeReq(
        partial: Partial<Request> & {
            headers?: { authorization?: string }
            query?: Record<string, unknown>
            body?: { id?: number }
        }
    ): Request {
        return {
            headers: {},
            query: {},
            ...partial,
        } as Request
    }

    function makeRes(): Response {
        return { status, json } as unknown as Response
    }

    it('sets authContext and calls next when verification succeeds', async () => {
        const ctx = { userId: 'alice', accessToken: 'tok' }
        verifyToken.mockResolvedValue(ctx)

        const req = makeReq({
            headers: { authorization: 'Bearer abc' },
        })
        const res = makeRes()
        const middleware = jwtAuth(authService, logger)

        await middleware(req, res, next)

        expect(verifyToken).toHaveBeenCalledWith('Bearer abc')
        expect(req.authContext).toEqual(ctx)
        expect(next).toHaveBeenCalledOnce()
        expect(status).not.toHaveBeenCalled()
    })

    it('uses Bearer token from query when Authorization header is absent', async () => {
        const ctx = { userId: 'bob', accessToken: 'tok' }
        verifyToken.mockResolvedValue(ctx)

        const req = makeReq({
            query: { token: 'query-jwt' },
        })
        const res = makeRes()
        const middleware = jwtAuth(authService, logger)

        await middleware(req, res, next)

        expect(verifyToken).toHaveBeenCalledWith('Bearer query-jwt')
        expect(req.authContext).toEqual(ctx)
        expect(next).toHaveBeenCalledOnce()
    })

    it('passes undefined to verifyToken when no credentials are present', async () => {
        verifyToken.mockResolvedValue(undefined)

        const req = makeReq({})
        const res = makeRes()
        const middleware = jwtAuth(authService, logger)

        await middleware(req, res, next)

        expect(verifyToken).toHaveBeenCalledWith(undefined)
        expect(req.authContext).toBeUndefined()
        expect(next).toHaveBeenCalledOnce()
    })

    it('returns a JSON-RPC 401 when verification throws', async () => {
        verifyToken.mockRejectedValue(new Error('bad sig'))

        const req = makeReq({
            headers: { authorization: 'Bearer x' },
            body: { id: 7 },
        })
        const res = makeRes()
        const middleware = jwtAuth(authService, logger)

        await middleware(req, res, next)

        expect(next).not.toHaveBeenCalled()
        expect(status).toHaveBeenCalledWith(401)
        expect(json).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            id: 7,
            error: {
                code: providerErrors.unauthorized().code,
                message: 'Invalid or expired token',
            },
        })
    })

    it('returns a JSON-RPC 503 instead of 401 when the identity provider is unavailable', async () => {
        verifyToken.mockRejectedValue(
            new IdpUnavailableError('connect ECONNREFUSED 10.0.0.1:443')
        )

        const req = makeReq({
            headers: { authorization: 'Bearer x' },
            body: { id: 7 },
        })
        const res = makeRes()
        const middleware = jwtAuth(authService, logger)

        await middleware(req, res, next)

        expect(next).not.toHaveBeenCalled()
        expect(status).toHaveBeenCalledWith(503)
        expect(json).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            id: 7,
            error: {
                code: rpcErrors.resourceUnavailable().code,
                message:
                    'Unable to verify the token, identity provider unavailable',
            },
        })
        expect(JSON.stringify(json.mock.calls[0][0])).not.toContain('10.0.0.1')
    })

    it('does not leak the underlying verification failure to the client', async () => {
        verifyToken.mockRejectedValue(
            new Error(
                'signature doesnt match the secret which is leaked-secret-123'
            )
        )

        const req = makeReq({
            headers: { authorization: 'Bearer x' },
        })
        const res = makeRes()
        const middleware = jwtAuth(authService, logger)

        await middleware(req, res, next)

        const body = JSON.stringify(json.mock.calls[0][0])
        expect(body).not.toContain('leaked-secret-123')
        expect(body).toContain('Invalid or expired token')
    })
})
