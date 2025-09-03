// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// middleware/jwtAuth.ts
import type { Request, Response, NextFunction } from 'express'
import { AuthService } from '@canton-network/core-wallet-auth'
import { Logger } from 'pino'

export function jwtAuth(authService: AuthService, logger: Logger) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization

        try {
            const context = await authService.verifyToken(authHeader)
            req.authContext = context
            next()
        } catch (err) {
            logger.warn({ err }, 'JWT verification failed')
            const message = err instanceof Error ? err.message : String(err)
            res.status(401).json({
                error: 'Invalid or expired token: ' + message,
            })
        }
    }
}
