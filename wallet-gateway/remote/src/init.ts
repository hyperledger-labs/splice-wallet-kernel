// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { dapp } from './dapp-api/server.js'
import { user } from './user-api/server.js'
import { web } from './web/server.js'
import { Logger } from 'pino'
import {
    StoreSql,
    bootstrap,
    connection,
    migrator,
} from '@canton-network/core-wallet-store-sql'
import {
    StoreSql as SigningStoreSql,
    bootstrap as signingBootstrap,
    connection as signingConnection,
    migrator as signingMigrator,
} from '@canton-network/core-signing-store-sql'
import { ConfigUtils } from './config/ConfigUtils.js'
import { Notifier } from './notification/NotificationService.js'
import EventEmitter from 'events'
import { SigningProvider } from '@canton-network/core-signing-lib'
import { ParticipantSigningDriver } from '@canton-network/core-signing-participant'
import { InternalSigningDriver } from '@canton-network/core-signing-internal'
import FireblocksSigningProvider from '@canton-network/core-signing-fireblocks'
import { jwtAuthService } from './auth/jwt-auth-service.js'
import express from 'express'
import { CliOptions } from './index.js'
import { jwtAuth } from './middleware/jwtAuth.js'
import { rpcRateLimit } from './middleware/rateLimit.js'
import { Config } from './config/Config.js'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { sql } from 'kysely'

let isReady = false

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

async function initializeDatabase(
    config: Config,
    logger: Logger
): Promise<StoreSql> {
    logger.info('Checking for database migrations...')

    let exists = true
    if (config.store.connection.type === 'sqlite') {
        exists = existsSync(config.store.connection.database)
    }

    if (config.store.connection.type === 'postgres') {
        const db = connection({
            ...config.store,
            connection: { ...config.store.connection, database: 'postgres' },
        })
        const result = await sql
            .raw<{
                '?column?': number
            }>(`select 1 from pg_database where datname='${config.store.connection.database}';`)
            .execute(db)
        const databaseExist = result.rows.length > 0
        if (!databaseExist) {
            // Ignore error because postgres does not support `create database if nor exists` clause
            await sql
                .raw(`create database ${config.store.connection.database};`)
                .execute(db)
                .catch(() => {})
            exists = false
        }
        await db.destroy()
    }

    const db = connection(config.store)
    const umzug = migrator(db)
    const pending = await umzug.pending()

    if (pending.length > 0) {
        logger.info(
            { pendingMigrations: pending.map((m) => m.name) },
            'Applying database migrations...'
        )
        await umzug.up()
        logger.info('Database migrations applied successfully.')
    } else {
        logger.info('No pending database migrations found.')
    }

    // bootstrap database from config file if it did not exist before
    if (!exists) {
        logger.info('Bootstrapping database from config...')
        await bootstrap(db, config.store, logger)
    }

    return new StoreSql(db, logger)
}

async function initializeSigningDatabase(
    config: Config,
    logger: Logger
): Promise<SigningStoreSql> {
    logger.info('Checking for signing database migrations...')

    let exists = true
    if (config.signingStore.connection.type === 'sqlite') {
        exists = existsSync(config.signingStore.connection.database)
    }

    if (config.signingStore.connection.type === 'postgres') {
        const db = signingConnection({
            ...config.signingStore,
            connection: {
                ...config.signingStore.connection,
                database: 'postgres',
            },
        })
        const result = await sql
            .raw<{
                '?column?': number
            }>(`select 1 from pg_database where datname='${config.signingStore.connection.database}';`)
            .execute(db)
        const databaseExist = result.rows.length > 0
        if (!databaseExist) {
            // Ignore error because postgres does not support `create database if nor exists` clause
            await sql
                .raw(
                    `create database ${config.signingStore.connection.database};`
                )
                .execute(db)
                .catch(() => {})
            exists = false
        }
        await db.destroy()
    }

    const db = signingConnection(config.signingStore)
    const umzug = signingMigrator(db)
    const pending = await umzug.pending()

    if (pending.length > 0) {
        logger.info(
            { pendingMigrations: pending.map((m) => m.name) },
            'Applying database migrations...'
        )
        await umzug.up()
        logger.info('Database migrations applied successfully.')
    } else {
        logger.info('No pending database migrations found.')
    }

    // bootstrap database from config file if it did not exist before
    if (!exists) {
        logger.info('Bootstrapping database from config...')
        await signingBootstrap(db, config.store, logger)
    }

    return new SigningStoreSql(db, logger)
}

export async function initialize(opts: CliOptions, logger: Logger) {
    const port = opts.port ? Number(opts.port) : 3030

    const app = express()
    const server = app.listen(port, () => {
        logger.info(
            `Remote Wallet Gateway starting on http://localhost:${port}`
        )
    })

    app.use('/healthz', rpcRateLimit, (_req, res) => res.status(200).send('OK'))
    app.use('/readyz', rpcRateLimit, (_req, res) => {
        if (isReady) {
            res.status(200).send('OK')
        } else {
            res.status(503).send('UNAVAILABLE')
        }
    })

    const notificationService = new NotificationService(logger)

    const config = ConfigUtils.loadConfigFile(opts.config)

    const store = await initializeDatabase(config, logger)
    const signingStore = await initializeSigningDatabase(config, logger)
    const authService = jwtAuthService(store, logger)

    // Provide apiKey from User API in Fireblocks
    const apiPath = path.resolve(process.cwd(), 'fireblocks_api.key')
    const secretPath = path.resolve(process.cwd(), 'fireblocks_secret.key')
    let apiKey = ''
    let apiSecret = ''

    if (existsSync(apiPath) && existsSync(secretPath)) {
        apiKey = readFileSync(apiPath, 'utf8')
        apiSecret = readFileSync(secretPath, 'utf8')
    } else {
        apiKey = 'missing'
        apiSecret = 'missing'
        logger.warn('Fireblocks keys files are missing')
    }

    const keyInfo = { apiKey, apiSecret }
    const userApiKeys = new Map([['user', keyInfo]])

    const drivers = {
        [SigningProvider.PARTICIPANT]: new ParticipantSigningDriver(),
        [SigningProvider.WALLET_KERNEL]: new InternalSigningDriver(
            signingStore
        ),
        [SigningProvider.FIREBLOCKS]: new FireblocksSigningProvider({
            defaultKeyInfo: keyInfo,
            userApiKeys,
        }),
    }

    app.use('/api/*splat', express.json())
    app.use('/api/*splat', rpcRateLimit)
    app.use('/api/*splat', jwtAuth(authService, logger))

    // register dapp API handlers
    dapp(
        '/api/v0/dapp',
        app,
        logger,
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
        logger,
        config.kernel,
        notificationService,
        drivers,
        store
    )

    // register web handler
    web(app, server)
    isReady = true

    logger.info('Wallet Gateway initialization complete')
}
