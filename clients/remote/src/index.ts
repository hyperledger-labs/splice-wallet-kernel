// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { dapp } from './dapp-api/server.js'
import { user } from './user-api/server.js'
import { web } from './web/server.js'
import { pino } from 'pino'
import ViteExpress from 'vite-express'
import { StoreSql, connection } from '@canton-network/core-wallet-store-sql'
import { ConfigUtils } from './config/ConfigUtils.js'
import { configSchema } from './config/Config.js'
import { Notifier } from './notification/NotificationService.js'
import EventEmitter from 'events'
import { SigningProvider } from '@canton-network/core-signing-lib'
import { ParticipantSigningDriver } from '@canton-network/core-signing-participant'
import { InternalSigningDriver } from '@canton-network/core-signing-internal'
import { jwtAuthService } from './auth/jwt-auth-service.js'

const dAppPort = Number(process.env.DAPP_API_PORT) || 3000
const userPort = Number(process.env.USER_API_PORT) || 3001
const webPort = Number(process.env.WEB_PORT) || 3002

const logger = pino({ name: 'main', level: 'debug' })

export class NotificationService implements NotificationService {
    private notifiers: Map<string, Notifier> = new Map()

    getNotifier(notifierId: string): Notifier {
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

const notificationService = new NotificationService()

const configPath = process.env.NETWORK_CONFIG_PATH || '../test/config.json'
const configFile = ConfigUtils.loadConfigFile(configPath)
const config = configSchema.parse(configFile)
const store = new StoreSql(connection(config.store), logger)
const authService = jwtAuthService(store, logger)

const drivers = {
    [SigningProvider.PARTICIPANT]: new ParticipantSigningDriver(),
    [SigningProvider.WALLET_KERNEL]: new InternalSigningDriver(),
}

export const dAppServer = dapp(
    config.kernel,
    notificationService,
    authService,
    store
).listen(dAppPort, () => {
    logger.info(`dApp Server running at http://localhost:${dAppPort}`)
})

export const userServer = user(
    config.kernel,
    notificationService,
    authService,
    drivers,
    store
).listen(userPort, () => {
    logger.info(`User Server running at http://localhost:${userPort}`)
})

export const webServer = ViteExpress.listen(web, webPort, () =>
    logger.info(`Web server running at http://localhost:${webPort}`)
)
