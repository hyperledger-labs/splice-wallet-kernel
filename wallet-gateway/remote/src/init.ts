// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { dapp } from './dapp-api/server.js'
import { user } from './user-api/server.js'
import { web } from './web/server.js'
import cors from 'cors'
import { Logger, pino } from 'pino'
import ViteExpress from 'vite-express'
import { StoreSql, connection } from '@canton-network/core-wallet-store-sql'
import { ConfigUtils } from './config/ConfigUtils.js'
import { Notifier } from './notification/NotificationService.js'
import EventEmitter from 'events'
import { SigningProvider } from '@canton-network/core-signing-lib'
import { ParticipantSigningDriver } from '@canton-network/core-signing-participant'
import { InternalSigningDriver } from '@canton-network/core-signing-internal'
import { jwtAuthService } from './auth/jwt-auth-service.js'
import express from 'express'
import { CliOptions } from './index.js'
import { jwtAuth } from './middleware/jwtAuth.js'
import { rpcRateLimit } from './middleware/rateLimit.js'

class NotificationService implements NotificationService {
    private notifiers: Map<string, Notifier> = new Map()

    constructor(private logger: Logger) {}

    getNotifier(notifierId: string): Notifier {
        const logger = this.logger
        let notifier = this.notifiers.get(notifierId)

        if (!notifier) {
            notifier = new EventEmitter()
            // Wrap all events to log with pino
            const originalEmit = notifier.emit
            notifier.emit = function (event: string, ...args: unknown[]) {
                logger.debug(
                    { event, args },
                    `Notifier emitted event: ${event}`
                )
                return originalEmit.apply(this, [event, ...args])
            }
            this.notifiers.set(notifierId, notifier)
        }

        return notifier
    }
}

export async function initialize(opts: CliOptions) {
    const logger = pino({
        name: 'main',
        level: 'debug',
        ...(opts.logFormat === 'pretty'
            ? {
                  transport: {
                      target: 'pino-pretty',
                  },
              }
            : {}),
    })

    const notificationService = new NotificationService(logger)

    const config = ConfigUtils.loadConfigFile(opts.config)
    const port = opts.port ? Number(opts.port) : 3030

    const store = new StoreSql(connection(config.store), logger)
    const authService = jwtAuthService(store, logger)

    const drivers = {
        [SigningProvider.PARTICIPANT]: new ParticipantSigningDriver(),
        [SigningProvider.WALLET_KERNEL]: new InternalSigningDriver(),
    }

    const app = express()
    app.use(cors()) // TODO: read allowedOrigins from config
    app.use('/api/*splat', express.json())
    app.use('/api/*splat', rpcRateLimit)
    app.use('/api/*splat', jwtAuth(authService, logger))

    const server = app.listen(port, () => {
        logger.info(`Remote Wallet Gateway running at http://localhost:${port}`)
    })

    // register dapp API handlers
    dapp(
        '/api/v0/dapp',
        app,
        server,
        config.kernel,
        notificationService,
        authService,
        store
    )

    // register user API handlers
    user(
        '/api/v0/user',
        app,
        config.kernel,
        notificationService,
        drivers,
        store
    )

    // register web handler
    web(app)

    if (process.env.NODE_ENV === 'development') {
        ViteExpress.bind(app, server)
    }
}
