// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Request, Response, NextFunction } from 'express'
import {
    IdpUnavailableError,
    type AuthService,
} from '@canton-network/core-wallet-auth'
import {
    providerErrors,
    rpcErrors,
    toHttpErrorCode,
} from '@canton-network/core-rpc-errors'
import { jsonRpcResponse } from '@canton-network/core-rpc-transport'
import type { Logger } from 'pino'

export function jwtAuth(authService: AuthService, logger: Logger) {
    return async (req: Request, res: Response, next: NextFunction) => {
        // If the request has been verified as an API key, skip JWT verification
        if (req.authContext?.isApiKey) {
            return next()
        }

        // Support both Authorization header and token query parameter (for EventSource)
        const authHeader =
            req.headers.authorization ||
            (typeof req.query.token === 'string' && req.query.token
                ? `Bearer ${req.query.token}`
                : undefined)

        try {
            const context = await authService.verifyToken(authHeader)
            req.authContext = context
            next()
        } catch (err) {
            // The token couldn't be checked, keep client session intact
            if (err instanceof IdpUnavailableError) {
                logger.error({ err }, 'Identity provider unavailable')
                const { code } = rpcErrors.resourceUnavailable()
                res.status(toHttpErrorCode(code)).json(
                    jsonRpcResponse(req.body?.id ?? null, {
                        error: {
                            code,
                            message:
                                'Unable to verify the token, identity provider unavailable',
                        },
                    })
                )
                return
            }

            // Reason stays in the logs, the client sees the token was rejected.
            logger.warn({ err }, 'JWT verification failed')
            res.status(401).json(
                jsonRpcResponse(req.body?.id ?? null, {
                    error: {
                        code: providerErrors.unauthorized().code,
                        message: 'Invalid or expired token',
                    },
                })
            )
        }
    }
}
