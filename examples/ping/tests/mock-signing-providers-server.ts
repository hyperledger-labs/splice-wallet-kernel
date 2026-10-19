// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { config as loadEnv } from 'dotenv'
import {
    createBlockdaemonMockProvider,
    createDfnsMockProvider,
    createFireblocksMockProvider,
    startSigningProviderMockServer,
    type SigningProviderMockRoute,
    type SigningProviderMockServer,
} from '@canton-network/core-wallet-test-utils'

loadEnv({ quiet: true, path: ['.env', '.env.local'] })

function parseProviderUrl(envVar: string) {
    const configuredUrl = process.env[envVar]
    if (!configuredUrl) {
        throw new Error(`${envVar} must be set`)
    }
    const parsedUrl = new URL(configuredUrl)
    if (!parsedUrl.port) {
        throw new Error(`${envVar} must include a port, got: ${configuredUrl}`)
    }

    return {
        configuredUrl,
        hostname: parsedUrl.hostname,
        port: Number(parsedUrl.port),
    }
}

function createHealthRoutes(): SigningProviderMockRoute[] {
    return [
        {
            method: 'GET',
            path: '/_healthz',
            handler: () => ({
                body: { ok: true },
            }),
        },
    ]
}

async function startBlockdaemonMockServer() {
    const blockdaemon = parseProviderUrl('BLOCKDAEMON_API_URL')

    const server = await startSigningProviderMockServer({
        host: blockdaemon.hostname,
        port: blockdaemon.port,
        logger: (message) =>
            console.log(`[signing-mocks:blockdaemon] ${message}`),
        routes: [...createHealthRoutes(), ...createBlockdaemonMockProvider()],
    })

    console.log(`[signing-mocks] blockdaemon listening on ${server.baseUrl}`)
    return server
}

async function startDfnsMockServer() {
    const dfns = parseProviderUrl('DFNS_BASE_URL')

    const server = await startSigningProviderMockServer({
        host: dfns.hostname,
        port: dfns.port,
        logger: (message) => console.log(`[signing-mocks:dfns] ${message}`),
        routes: [...createHealthRoutes(), ...createDfnsMockProvider()],
    })

    console.log(`[signing-mocks] dfns listening on ${server.baseUrl}`)
    return server
}

async function startFireblocksMockServer() {
    const fireblocks = parseProviderUrl('FIREBLOCKS_API_PATH')

    const server = await startSigningProviderMockServer({
        host: fireblocks.hostname,
        port: fireblocks.port,
        logger: (message) =>
            console.log(`[signing-mocks:fireblocks] ${message}`),
        routes: [...createHealthRoutes(), ...createFireblocksMockProvider()],
    })

    console.log(`[signing-mocks] fireblocks listening on ${server.baseUrl}`)
    return server
}

const mode = process.argv[2] ?? 'all'
const servers: SigningProviderMockServer[] = []

if (mode === 'all' || mode === 'blockdaemon') {
    servers.push(await startBlockdaemonMockServer())
}
if (mode === 'all' || mode === 'dfns') {
    servers.push(await startDfnsMockServer())
}
if (mode === 'all' || mode === 'fireblocks') {
    servers.push(await startFireblocksMockServer())
}
if (servers.length === 0) {
    throw new Error(
        `Unknown mock signing provider mode "${mode}". Expected all, blockdaemon, dfns, or fireblocks.`
    )
}

let shuttingDown = false
const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`[signing-mocks] received ${signal}, shutting down`)
    await Promise.all(servers.map((server) => server.close()))
    process.exit(0)
}

process.on('SIGINT', () => {
    void shutdown('SIGINT')
})
process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
})
