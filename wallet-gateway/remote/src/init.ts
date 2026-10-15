// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { dapp } from './dapp-api/server.js'
import { user } from './user-api/server.js'
import { web } from './web/server.js'
import type { Logger } from 'pino'
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
import { jwtAuthService } from './auth/jwt-auth-service.js'
import express from 'express'
import type { CliOptions } from './index.js'
import { jwtAuth } from './middleware/jwtAuth.js'
import {
    authenticatedRateLimiter,
    preAuthIpRateLimiter,
    rateLimiter,
} from './middleware/rateLimit.js'
import type { Config } from './config/Config.js'
import { deriveUrls } from './config/ConfigUtils.js'
import { existsSync } from 'fs'
import { GATEWAY_VERSION } from './version.js'
import { sessionHandler } from './middleware/sessionHandler.js'
import { sql } from 'kysely'
import { SigningWorker } from './signing/signing-worker.js'
import { apiKeyAuth } from './middleware/apiKeyAuth.js'
import { securityHeaders } from './middleware/securityHeaders.js'
import {
    type HASHING_SCHEME_VERSION,
    NotificationService,
} from '@canton-network/core-wallet-services'
import { errorHandler } from './middleware/errorHandler.js'
import { registerSigningProviders } from './signing-providers-registration.js'

let isReady = false
let signingWorker: SigningWorker | undefined

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
            }>(
                `select 1 from pg_database where datname='${config.store.connection.database}';`
            )
            .execute(db)
        const databaseExist = result.rows.length > 0
        if (!databaseExist) {
            // Ignore error because postgres does not support `create database if nor exists` clause
            await sql
                .raw(`create database ${config.store.connection.database};`)
                .execute(db)
                .catch(() => {})
            exists = false
        } else {
            const appDb = connection(config.store)
            try {
                const idpsTable = await sql
                    .raw<{
                        exists: boolean
                    }>(
                        `select exists(select 1 from information_schema.tables where table_schema='public' and table_name='idps') as exists;`
                    )
                    .execute(appDb)
                const networksTable = await sql
                    .raw<{
                        exists: boolean
                    }>(
                        `select exists(select 1 from information_schema.tables where table_schema='public' and table_name='networks') as exists;`
                    )
                    .execute(appDb)

                const idpsExists = Boolean(idpsTable.rows[0]?.exists)
                const networksExists = Boolean(networksTable.rows[0]?.exists)

                let idpsHasRows = false
                let networksHasRows = false

                if (idpsExists) {
                    const idpsCount = await sql
                        .raw<{
                            rowCount: number | string
                        }>(`select count(*) as "rowCount" from idps;`)
                        .execute(appDb)
                    idpsHasRows = Number(idpsCount.rows[0]?.rowCount ?? 0) > 0
                }

                if (networksExists) {
                    const networksCount = await sql
                        .raw<{
                            rowCount: number | string
                        }>(`select count(*) as "rowCount" from networks;`)
                        .execute(appDb)
                    networksHasRows =
                        Number(networksCount.rows[0]?.rowCount ?? 0) > 0
                }

                if (
                    !idpsExists ||
                    !networksExists ||
                    !idpsHasRows ||
                    !networksHasRows
                ) {
                    logger.warn(
                        'Database exists but required tables are missing or empty. Attempting to bootstrap...'
                    )
                    exists = false
                }
            } finally {
                await appDb.destroy()
            }
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
        await bootstrap(db, config.bootstrap)
    }

    return new StoreSql(db)
}

async function initializeSigningDatabase(
    signingStoreConfig: NonNullable<Config['signingStore']>,
    logger: Logger
): Promise<SigningStoreSql> {
    logger.info('Checking for signing database migrations...')

    let exists = true
    if (signingStoreConfig.connection.type === 'sqlite') {
        exists = existsSync(signingStoreConfig.connection.database)
    }

    if (signingStoreConfig.connection.type === 'postgres') {
        const db = signingConnection({
            ...signingStoreConfig,
            connection: {
                ...signingStoreConfig.connection,
                database: 'postgres',
            },
        })
        const result = await sql
            .raw<{
                '?column?': number
            }>(
                `select 1 from pg_database where datname='${signingStoreConfig.connection.database}';`
            )
            .execute(db)
        const databaseExist = result.rows.length > 0
        if (!databaseExist) {
            // Ignore error because postgres does not support `create database if nor exists` clause
            await sql
                .raw(
                    `create database ${signingStoreConfig.connection.database};`
                )
                .execute(db)
                .catch(() => {})
            exists = false
        }
        await db.destroy()
    }

    const db = signingConnection(signingStoreConfig)
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
        logger.info('Bootstrapping signing database from config...')
        await signingBootstrap(db)
    }

    return new SigningStoreSql(db)
}

export async function initialize(opts: CliOptions, logger: Logger) {
    const config = ConfigUtils.loadConfigFile(opts.config)

    // Use CLI port override or config port
    const port = opts.port ? Number(opts.port) : config.server.port
    const { serviceUrl, publicUrl, dappApiUrl, userApiUrl } = deriveUrls(
        config,
        port
    )

    const app = express()
    app.set('trust proxy', config.server.trustProxy)
    app.use(securityHeaders())

    const server = app.listen(port, () => {
        logger.info(`Remote Wallet Gateway starting on ${serviceUrl})`)
    })
    app.use(express.json({ limit: config.server.requestSizeLimit }))

    const preAuthRateLimit = preAuthIpRateLimiter(
        config.server.requestRateLimit
    )
    const postAuthRateLimit = authenticatedRateLimiter(
        config.server.requestRateLimit
    )
    const healthCheckRateLimit = rateLimiter(1000) // Allow more requests for health checks

    app.use('/healthz', healthCheckRateLimit, (_req, res) =>
        res.status(200).send('OK')
    )
    app.use('/readyz', healthCheckRateLimit, (_req, res) => {
        if (isReady) {
            res.status(200).send('OK')
        } else {
            res.status(503).send('UNAVAILABLE')
        }
    })

    const notificationService = new NotificationService(logger)

    const store = await initializeDatabase(config, logger)
    const signingStore = config.signingStore
        ? await initializeSigningDatabase(config.signingStore, logger)
        : undefined
    const authService = jwtAuthService(store, logger)

    const drivers = registerSigningProviders(
        config.signingProviders,
        signingStore,
        logger
    )

    const allowedPaths = {
        [config.server.dappPath]: ['*'],
        [config.server.userPath]: [
            'addSession',
            'listNetworks',
            'listIdps',
            'getUser',
            'selfSignedAccessToken',
            'startSelfIssuedLoginSession',
        ],
    }
    const selfIssuedLoginPaths = {
        [config.server.userPath]: [
            'getSelfIssuedLoginMode',
            'createSelfIssuedWallet',
            'allocateSelfIssuedWallet',
            'completeSelfIssuedLogin',
            'removeSelfIssuedLoginSession',
        ],
    }

    const apiMiddleware = [
        preAuthRateLimit,
        apiKeyAuth(
            store,
            config.server.dappPath,
            logger.child({ component: 'ApiKeyHandler' })
        ),
        jwtAuth(authService, logger.child({ component: 'JwtHandler' })),
        postAuthRateLimit,
        sessionHandler(
            store,
            allowedPaths,
            logger.child({ component: 'SessionHandler' }),
            selfIssuedLoginPaths
        ),
    ]

    app.use(config.server.userPath, ...apiMiddleware)
    app.use(config.server.dappPath, ...apiMiddleware)

    logger.info({ ...config.server, port }, 'Server configuration')

    const kernelInfo = config.kernel

    const signingWorkerLogger = logger.child({
        component: 'SigningWorker',
    })

    const hashingSchemeVersion: HASHING_SCHEME_VERSION =
        config.hashingScheme?.version ?? 'HASHING_SCHEME_VERSION_V3'

    signingWorker = new SigningWorker({
        intervalMs: config.server.signingWorker.pollInterval,
        signingDrivers: drivers,
        store,
        notificationService,
        logger: signingWorkerLogger,
        hashingSchemeVersion,
    })
    signingWorker.start()

    // register dapp API handlers
    dapp(
        config.server.dappPath,
        app,
        logger,
        server,
        kernelInfo,
        dappApiUrl,
        publicUrl,
        config.server,
        notificationService,
        store,
        {
            signingDrivers: drivers,
        },
        hashingSchemeVersion
    )

    // register user API handlers
    user(
        config.server.userPath,
        app,
        logger,
        kernelInfo,
        publicUrl,
        notificationService,
        drivers,
        store,
        hashingSchemeVersion,
        config.server.admin
    )

    const { userPath, dappPath } = config.server
    const isApiPath = (path: string) =>
        path === userPath ||
        path === dappPath ||
        path.startsWith(`${userPath}/`) ||
        path.startsWith(`${dappPath}/`)

    // register web handler
    web(app, server, userApiUrl, dappApiUrl, isApiPath)

    app.use(
        errorHandler(logger.child({ component: 'ErrorHandler' }), isApiPath)
    )

    isReady = true

    logger.info(
        `Wallet Gateway (version: ${GATEWAY_VERSION}) initialization complete`
    )
    logger.info(`Wallet Gateway UI available on ${publicUrl}`)
    logger.info(`dApp API available on ${dappApiUrl}`)
}
