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
import { SigningProvider } from '@canton-network/core-signing-lib'
import { ParticipantSigningDriver } from '@canton-network/core-signing-participant'
import { InternalSigningDriver } from '@canton-network/core-signing-internal'
import DfnsSigningProvider from '@canton-network/core-signing-dfns'
import FireblocksSigningProvider from '@canton-network/core-signing-fireblocks'
import BlockdaemonSigningProvider, {
    type CantonCaip2,
} from '@canton-network/core-signing-blockdaemon'
import SecurosysSigningProvider, {
    type TsbSignatureAlgorithm,
} from '@canton-network/core-signing-securosys'
import BitGoSigningProvider from '@canton-network/core-signing-bitgo'
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
import { Env } from './env.js'
import { SigningWorker } from './signing/signing-worker.js'
import { apiKeyAuth } from './middleware/apiKeyAuth.js'
import { securityHeaders } from './middleware/securityHeaders.js'
import {
    type HASHING_SCHEME_VERSION,
    NotificationService,
    type SigningDrivers,
} from '@canton-network/core-wallet-services'
import { errorHandler } from './middleware/errorHandler.js'

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
        await bootstrap(db, config.bootstrap, logger)
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
            }>(
                `select 1 from pg_database where datname='${config.signingStore.connection.database}';`
            )
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
        logger.info('Bootstrapping signing database from config...')
        await signingBootstrap(db, config.signingStore, logger)
    }

    return new SigningStoreSql(db, logger)
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
    const signingStore = await initializeSigningDatabase(config, logger)
    const authService = jwtAuthService(store, logger)

    let apiKey = Env.FIREBLOCKS_API_KEY()
    let apiSecret = Env.FIREBLOCKS_SECRET()

    if (!apiKey || !apiSecret) {
        apiKey = 'missing'
        apiSecret = 'missing'
        logger.warn('Fireblocks key files are missing')
    }

    const keyInfo = { apiKey, apiSecret }
    const userApiKeys = new Map([['user', keyInfo]])
    const securosysKeyManagementApiKey =
        Env.SECUROSYS_TSB_KEY_MANAGEMENT_API_KEY()
    const securosysKeyOperationApiKey =
        Env.SECUROSYS_TSB_KEY_OPERATION_API_KEY()
    const securosysBearerToken = Env.SECUROSYS_TSB_BEARER_TOKEN()
    const securosysMtlsP12Path = Env.SECUROSYS_TSB_MTLS_P12_PATH()
    const securosysMtlsP12Password = Env.SECUROSYS_TSB_MTLS_P12_PASSWORD()
    const securosysKeyPassword = Env.SECUROSYS_TSB_KEY_PASSWORD()
    const securosysBaseUrl = Env.SECUROSYS_TSB_BASE_URL()

    const drivers: SigningDrivers = {
        [SigningProvider.PARTICIPANT]: new ParticipantSigningDriver(),
        [SigningProvider.WALLET_KERNEL]: new InternalSigningDriver(
            signingStore
        ),
        [SigningProvider.FIREBLOCKS]: new FireblocksSigningProvider({
            defaultKeyInfo: keyInfo,
            userApiKeys,
            apiPath: Env.FIREBLOCKS_API_PATH('https://api.fireblocks.io/v1'),
        }),
        [SigningProvider.BLOCKDAEMON]: new BlockdaemonSigningProvider({
            baseUrl: Env.BLOCKDAEMON_API_URL(
                'http://localhost:5080/api/cwp/canton'
            ),
            apiKey: Env.BLOCKDAEMON_API_KEY(''),
            caip2: Env.BLOCKDAEMON_CAIP2('canton:testnet') as CantonCaip2,
        }),
    }

    if (securosysBaseUrl) {
        drivers[SigningProvider.SECUROSYS] = new SecurosysSigningProvider({
            baseUrl: securosysBaseUrl,
            ...(securosysKeyManagementApiKey && {
                keyManagementApiKey: securosysKeyManagementApiKey,
            }),
            ...(securosysKeyOperationApiKey && {
                keyOperationApiKey: securosysKeyOperationApiKey,
            }),
            ...(securosysBearerToken && { bearerToken: securosysBearerToken }),
            ...(securosysMtlsP12Path && { mtlsP12Path: securosysMtlsP12Path }),
            ...(securosysMtlsP12Password && {
                mtlsP12Password: securosysMtlsP12Password,
            }),
            ...(securosysKeyPassword && { keyPassword: securosysKeyPassword }),
            signatureAlgorithm: Env.SECUROSYS_TSB_SIGNATURE_ALGORITHM(
                'EDDSA'
            ) as TsbSignatureAlgorithm,
        })
    } else {
        logger.warn(
            'Securosys TSB base URL not set — Securosys signing provider will be unavailable'
        )
    }

    if (
        Env.DFNS_ORG_ID() &&
        Env.DFNS_CRED_ID() &&
        Env.DFNS_PRIVATE_KEY() &&
        Env.DFNS_AUTH_TOKEN()
    ) {
        drivers[SigningProvider.DFNS] = new DfnsSigningProvider({
            orgId: Env.DFNS_ORG_ID()!,
            baseUrl: Env.DFNS_BASE_URL('https://api.dfns.io'),
            credentials: {
                credId: Env.DFNS_CRED_ID()!,
                privateKey: Env.DFNS_PRIVATE_KEY()!,
                authToken: Env.DFNS_AUTH_TOKEN()!,
            },
        })
    } else {
        logger.warn(
            'Dfns env vars not fully set — Dfns signing provider will be unavailable'
        )
    }

    if (Env.BITGO_ACCESS_TOKEN()) {
        if (!Env.BITGO_ENTERPRISE_ID()) {
            logger.warn(
                'BITGO_ENTERPRISE_ID not set — wallet creation (createKey) will fail and restart-safe transaction lookup will be unavailable'
            )
        }
        drivers[SigningProvider.BITGO] = new BitGoSigningProvider({
            accessToken: Env.BITGO_ACCESS_TOKEN()!,
            baseUrl: Env.BITGO_API_URL('https://app.bitgo.com'),
            enterpriseId: Env.BITGO_ENTERPRISE_ID(),
            coin: Env.BITGO_COIN(),
        })
    } else {
        logger.warn(
            'BITGO_ACCESS_TOKEN not set — BitGo signing provider will be unavailable'
        )
    }

    const allowedPaths = {
        [config.server.dappPath]: ['*'],
        [config.server.userPath]: [
            'addSession',
            'listNetworks',
            'listIdps',
            'getUser',
            'selfSignedAccessToken',
            'addSelfIssuedSession',
        ],
    }
    const onboardingPaths = {
        [config.server.userPath]: [
            'getSelfIssuedOnboarding',
            'createSelfIssuedWallet',
            'allocateSelfIssuedWallet',
            'connectSelfIssuedSession',
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
            onboardingPaths
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
