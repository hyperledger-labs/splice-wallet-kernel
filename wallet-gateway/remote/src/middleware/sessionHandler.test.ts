// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import type { AuthAware, AuthContext } from '@canton-network/core-wallet-auth'
import { pino } from 'pino'
import { sink } from 'pino-test'
import { sessionHandler } from './sessionHandler.js'
import { providerErrors } from '@canton-network/core-rpc-errors'
import type { Store } from '@canton-network/core-wallet-store'

describe('sessionHandler', () => {
    const getSession = vi.fn()
    const getSelfIssuedLoginSession = vi.fn()
    const withAuthContext = vi.fn(() => ({ getSession }))
    const store = {
        withAuthContext,
        getSelfIssuedLoginSession,
    } as unknown as Store & AuthAware<Store>
    const logger = pino({ level: 'silent' }, sink())

    const allowedPaths = {
        '/api/v0/user': ['addSession', 'listNetworks', 'getUser'],
        '/api/v0/dapp': ['*'],
    }

    let next: NextFunction
    let status: ReturnType<typeof vi.fn>
    let json: ReturnType<typeof vi.fn>

    const authContext: AuthContext = {
        userId: 'user-1',
        accessToken: 'access-token',
    }

    beforeEach(() => {
        getSession.mockReset()
        getSelfIssuedLoginSession.mockReset()
        withAuthContext.mockClear()
        withAuthContext.mockReturnValue({ getSession })
        next = vi.fn() as NextFunction
        status = vi.fn().mockReturnThis()
        json = vi.fn()
    })

    function makeReq(
        partial: Partial<Request> & {
            method?: string
            baseUrl?: string
            body?: {
                method?: string
                id?: number
                params?: Record<string, unknown>
            }
            authContext?: AuthContext
        }
    ): Request {
        return {
            method: 'POST',
            baseUrl: '/api/v0/user',
            body: { method: 'listWallets' },
            authContext,
            ...partial,
        } as Request
    }

    function makeRes(): Response {
        return { status, json } as unknown as Response
    }

    it('skips session check for non-POST requests', async () => {
        const req = makeReq({ method: 'GET' })
        const res = makeRes()
        const middleware = sessionHandler(store, allowedPaths, logger)

        await middleware(req, res, next)

        expect(withAuthContext).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalledOnce()
        expect(status).not.toHaveBeenCalled()
    })

    it('allows unauthenticated POST when the RPC method is on the allow list', async () => {
        const req = makeReq({ body: { method: 'addSession' } })
        const res = makeRes()
        const middleware = sessionHandler(store, allowedPaths, logger)

        await middleware(req, res, next)

        expect(withAuthContext).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalledOnce()
        expect(status).not.toHaveBeenCalled()
    })

    it('allows unauthenticated POST when the path uses a wildcard allow list', async () => {
        const req = makeReq({
            baseUrl: '/api/v0/dapp',
            body: { method: 'connect' },
        })
        const res = makeRes()
        const middleware = sessionHandler(store, allowedPaths, logger)

        await middleware(req, res, next)

        expect(withAuthContext).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalledOnce()
    })

    it('calls next when an active session exists for a protected method', async () => {
        getSession.mockResolvedValue({
            id: 'session-1',
            network: 'network1',
            accessToken: 'session-token',
        })
        const req = makeReq({ body: { method: 'listWallets' } })
        const res = makeRes()
        const middleware = sessionHandler(store, allowedPaths, logger)

        await middleware(req, res, next)

        expect(withAuthContext).toHaveBeenCalledWith(authContext)
        expect(getSession).toHaveBeenCalled()
        expect(next).toHaveBeenCalledOnce()
        expect(status).not.toHaveBeenCalled()
    })

    it('returns 401 when no session exists for a protected method', async () => {
        getSession.mockResolvedValue(undefined)
        const req = makeReq({ body: { method: 'listWallets' } })
        const res = makeRes()
        const middleware = sessionHandler(store, allowedPaths, logger)

        await middleware(req, res, next)

        expect(withAuthContext).toHaveBeenCalledWith(authContext)
        expect(next).not.toHaveBeenCalled()
        expect(status).toHaveBeenCalledWith(401)
        expect(json).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            id: null,
            error: {
                code: providerErrors.unauthorized().code,
                message: 'No active session found',
            },
        })
    })

    it('returns 401 without calling getSession when no access token is present', async () => {
        const req = makeReq({
            body: { method: 'listWallets' },
            authContext: undefined,
        })
        const res = makeRes()
        const middleware = sessionHandler(store, allowedPaths, logger)

        await middleware(req, res, next)

        expect(getSession).not.toHaveBeenCalled()
        expect(next).not.toHaveBeenCalled()
        expect(status).toHaveBeenCalledWith(401)
        expect(json).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            id: null,
            error: {
                code: providerErrors.unauthorized().code,
                message: 'No active session found',
            },
        })
    })

    it('keeps the JSON-RPC request id in the 401 response', async () => {
        getSession.mockResolvedValue(undefined)
        const req = makeReq({ body: { method: 'listWallets', id: 42 } })
        const res = makeRes()
        const middleware = sessionHandler(store, allowedPaths, logger)

        await middleware(req, res, next)

        expect(json).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }))
    })

    it('requires a session when the path is not in the allow list config', async () => {
        getSession.mockResolvedValue(undefined)
        const req = makeReq({
            baseUrl: '/api/v0/other',
            body: { method: 'addSession' },
        })
        const res = makeRes()
        const middleware = sessionHandler(store, allowedPaths, logger)

        await middleware(req, res, next)

        expect(withAuthContext).toHaveBeenCalledWith(authContext)
        expect(status).toHaveBeenCalledWith(401)
    })

    describe('self-issued login methods', () => {
        const selfIssuedLoginPaths = {
            '/api/v0/user': ['createSelfIssuedWallet'],
        }

        it('sets a tokenless auth context from the session id', async () => {
            getSelfIssuedLoginSession.mockResolvedValue({
                id: 'onboarding-1',
                network: 'network1',
                origin: 'https://app.example',
                userId: 'alice',
            })
            const req = makeReq({
                authContext: undefined,
                body: {
                    method: 'createSelfIssuedWallet',
                    params: { sessionId: 'onboarding-1' },
                },
            })
            const middleware = sessionHandler(
                store,
                allowedPaths,
                logger,
                selfIssuedLoginPaths
            )

            await middleware(req, makeRes(), next)

            expect(getSelfIssuedLoginSession).toHaveBeenCalledWith(
                'onboarding-1'
            )
            expect(req.authContext).toEqual({
                userId: 'alice',
                accessToken: '',
                sessionId: 'onboarding-1',
            })
            expect(next).toHaveBeenCalledOnce()
            expect(status).not.toHaveBeenCalled()
        })

        it.each([
            ['is missing', undefined],
            ['is unknown or already has a token', 'onboarding-1'],
        ])(
            'rejects the call when the self-issued login session %s',
            async (_, sessionId) => {
                getSelfIssuedLoginSession.mockResolvedValue(undefined)
                const req = makeReq({
                    authContext: undefined,
                    body: {
                        method: 'createSelfIssuedWallet',
                        params: sessionId ? { sessionId } : {},
                    },
                })
                const middleware = sessionHandler(
                    store,
                    allowedPaths,
                    logger,
                    selfIssuedLoginPaths
                )

                await middleware(req, makeRes(), next)

                expect(next).not.toHaveBeenCalled()
                expect(status).toHaveBeenCalledWith(401)
                expect(json).toHaveBeenCalledWith({
                    jsonrpc: '2.0',
                    id: null,
                    error: {
                        code: providerErrors.unauthorized().code,
                        message: 'No self-issued login session found',
                    },
                })
            }
        )
    })

    it('requires a session when the RPC method is not on the path allow list', async () => {
        getSession.mockResolvedValue(undefined)
        const req = makeReq({ body: { method: 'removeSession' } })
        const res = makeRes()
        const middleware = sessionHandler(store, allowedPaths, logger)

        await middleware(req, res, next)

        expect(withAuthContext).toHaveBeenCalledWith(authContext)
        expect(status).toHaveBeenCalledWith(401)
    })
})
