// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { Kysely } from 'kysely'
import type { BootstrapConfig } from '@canton-network/core-wallet-store'
import { bootstrap } from './bootstrap.js'
import { migrator } from './migrator.js'
import { connection } from './store-sql.js'
import type { DB } from './schema.js'

const bootstrapConfig: BootstrapConfig = {
    idps: [
        {
            id: 'idp-1',
            type: 'oauth',
            issuer: 'https://issuer.example',
            configUrl:
                'https://issuer.example/.well-known/openid-configuration',
        },
        {
            id: 'idp-2',
            type: 'self_signed',
            issuer: 'unsafe-auth',
        },
    ],
    networks: [
        {
            id: 'net-1',
            name: 'Devnet',
            description: 'Bootstrap network',
            identityProviderId: 'idp-1',
            ledgerApi: { baseUrl: 'http://localhost:6865' },
            auth: {
                method: 'client_credentials',
                audience: 'aud',
                scope: 'scope',
                clientId: 'cid',
                clientSecret: 'secret',
            },
        },
    ],
}

describe('bootstrap', () => {
    let db: Kysely<DB>

    beforeEach(async () => {
        db = connection({
            connection: { type: 'memory' },
        })
        await migrator(db).up()
    })

    afterEach(async () => {
        await db.destroy()
    })

    test('loads configured idps and networks into the store', async () => {
        await bootstrap(db, bootstrapConfig)

        const idps = await db.selectFrom('idps').selectAll().execute()
        const networks = await db.selectFrom('networks').selectAll().execute()

        expect(idps.map((row) => row.id).sort()).toEqual(['idp-1', 'idp-2'])
        expect(networks).toHaveLength(1)
        expect(networks[0]?.id).toBe('net-1')
        expect(networks[0]?.ledgerApiBaseUrl).toBe('http://localhost:6865')
    })
})
