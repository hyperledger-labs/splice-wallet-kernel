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
    indexExists,
    listColumns,
    primaryKeyColumns,
} from '../helpers'
import { insertSession } from '../seeds/004-add-session-id'

const TARGET = 15

forEachDialect('migration 015 - add origin field to sessions', ({ getDb }) => {
    test('clears existing sessions and adds non-null origin column with indexes', async () => {
        const db = getDb()
        await migrateUpToBefore(db, TARGET)

        await insertSession(db, {
            id: 'sess-pre',
            network: 'net1',
            accessToken: 'token-old',
            userId: 'user1',
        })

        await migrateUpThrough(db, TARGET)

        // Migration deletes all pre-existing sessions
        const rows = await sql`SELECT * FROM sessions`.execute(db)
        expect(rows.rows).toHaveLength(0)

        // origin column is present and not nullable
        const cols = await listColumns(db, 'sessions')
        const byName = new Map(cols.map((c) => [c.name, c]))
        expect(byName.get('origin')?.nullable).toBe(false)

        // id is the primary key
        expect(await primaryKeyColumns(db, 'sessions')).toEqual(['id'])

        // unique indexes are created
        expect(
            await indexExists(
                db,
                'sessions',
                'sessions_one_session_per_origin_user'
            )
        ).toBe(true)
        expect(
            await indexExists(
                db,
                'sessions',
                'sessions_unique_access_token_per_network'
            )
        ).toBe(true)
    })

    test('down removes the origin column', async () => {
        const db = getDb()
        await migrateUpThrough(db, TARGET)

        await migrateDownThrough(db, TARGET)

        expect(await hasColumn(db, 'sessions', 'origin')).toBe(false)
    })
})
