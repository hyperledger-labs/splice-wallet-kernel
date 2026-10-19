// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'
import { sql } from 'kysely'

import {
    forEachDialect,
    migrateDownThrough,
    migrateUpThrough,
    migrateUpToBefore,
    hasColumn,
    listColumns,
} from '../helpers'
import { insertIdp, insertNetwork as insertNetwork001 } from '../seeds/001-init'
import { insertNetwork as insertNetwork014 } from '../seeds/014-add-service-account-column'

const TARGET = 14

forEachDialect('migration 014 - add service account column', ({ getDb }) => {
    test('adds nullable service_account_auth column and preserves existing rows', async () => {
        const db = getDb()
        await migrateUpToBefore(db, TARGET)

        await insertIdp(db, { id: 'idp1' })
        await insertNetwork001(db, {
            id: 'net1',
            idpId: 'idp1',
        })

        await migrateUpThrough(db, TARGET)

        const cols = await listColumns(db, 'networks')
        const byName = new Map(cols.map((c) => [c.name, c]))
        expect(byName.get('service_account_auth')?.nullable).toBe(true)

        const rows = await sql`
            SELECT service_account_auth, id, identity_provider_id FROM networks
        `.execute(db)
        expect(rows.rows).toHaveLength(1)
        expect(rows.rows[0]).toMatchObject({
            id: 'net1',
        })
    })

    test('down removes the service_account_auth column and preserves existing rows', async () => {
        const db = getDb()
        await migrateUpThrough(db, TARGET)

        await insertIdp(db, { id: 'idp1' })
        await insertNetwork014(db, {
            id: 'net1',
            idpId: 'idp1',
            serviceAccountAuth: JSON.stringify({
                method: 'client_credentials',
                scope: 'daml_ledger_api',
                audience: 'aud',
                clientId: 'service_account',
                clientSecret: 'service-account-secret',
            }),
        })

        await migrateDownThrough(db, TARGET)

        expect(await hasColumn(db, 'networks', 'service_account_auth')).toBe(
            false
        )

        const rows = await sql`SELECT * FROM networks`.execute(db)
        expect(rows.rows).toHaveLength(1)

        expect(rows.rows[0]).toMatchObject({
            id: 'net1',
            name: 'net1',
            description: null,
        })
        expect(rows.rows[0]).not.toHaveProperty('service_account_auth')
    })
})
