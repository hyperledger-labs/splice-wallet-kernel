// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Request, Response, NextFunction } from 'express'
import type { AuthAware } from '@canton-network/core-wallet-auth'
import { providerErrors } from '@canton-network/core-rpc-errors'
import { jsonRpcResponse } from '@canton-network/core-rpc-transport'
import type { Logger } from 'pino'
import type { Store } from '@canton-network/core-wallet-store'

/**
 * Middleware to handle session validation based on user sessions.
 * @param store needs to be AuthAware
 * @param allowedPaths a record of path -> list of methods which do not require authentication
 * @param logger
 * @param selfIssuedLoginPaths a record of path -> list of methods authenticated by a tokenless
 * self-issued login session, passed as `params.sessionId`
 * @returns
 */
export function sessionHandler(
    store: Store & AuthAware<Store>,
    allowedPaths: Record<string, string[]>,
    logger: Logger,
    selfIssuedLoginPaths: Record<string, string[]> = {}
) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const context = req.authContext
        const allowedMethods = allowedPaths[req.baseUrl as string]
        const selfIssuedLoginMethods =
            selfIssuedLoginPaths[req.baseUrl as string]

        if (req.method !== 'POST') {
            logger.debug(
                `Skipping authentication for ${req.method} request to ${req.baseUrl}`
            )
            return next()
        }

        if (
            allowedMethods &&
            (allowedMethods.includes(req.body.method) ||
                allowedMethods.includes('*'))
        ) {
            logger.debug(
                `Allowing unauthenticated access to ${req.baseUrl} for method ${req.body.method}`
            )
            return next()
        }

        const reqId = req.body?.id ?? null

        if (selfIssuedLoginMethods?.includes(req.body.method)) {
            const sessionId = req.body.params?.sessionId
            const session =
                typeof sessionId === 'string' && sessionId
                    ? await store.getSelfIssuedLoginSession(sessionId)
                    : undefined
            if (!session?.userId) {
                logger.debug('No self-issued login session found')
                return res.status(401).json(
                    jsonRpcResponse(reqId, {
                        error: {
                            code: providerErrors.unauthorized().code,
                            message: 'No self-issued login session found',
                        },
                    })
                )
            }

            req.authContext = {
                userId: session.userId,
                accessToken: '',
                sessionId: session.id,
            }
            return next()
        }

        if (!context?.accessToken) {
            logger.debug('No access token provided for protected method')
            return res.status(401).json(
                jsonRpcResponse(reqId, {
                    error: {
                        code: providerErrors.unauthorized().code,
                        message: 'No active session found',
                    },
                })
            )
        }

        logger.debug('Checking for active session for ' + context.userId)
        const session = await store
            .withAuthContext(context)
            .getSession(context.accessToken)
        if (!session) {
            logger.debug('No active session found for ' + context.userId)
            return res.status(401).json(
                jsonRpcResponse(reqId, {
                    error: {
                        code: providerErrors.unauthorized().code,
                        message: 'No active session found',
                    },
                })
            )
        }

        next()
    }
}
