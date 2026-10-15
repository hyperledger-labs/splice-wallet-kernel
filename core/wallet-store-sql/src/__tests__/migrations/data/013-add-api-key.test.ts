// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import {
    columnNames,
    forEachDialect,
    listColumns,
    migrateDownThrough,
    migrateUpThrough,
    migrateUpToBefore,
    primaryKeyColumns,
    tableExists,
} from '../helpers.js'
import { insertApiKey } from '../seeds/013-add-api-key.js'

const TARGET = 13
const TABLE = 'api_keys'

forEachDialect('migration 013 - api keys', ({ getDb }) => {
    test('creates api_keys table with expected columns, primary key', async () => {
        const db = getDb()
        await migrateUpToBefore(db, TARGET)
        expect(await tableExists(db, TABLE)).toBe(false)

        await migrateUpThrough(db, TARGET)

        expect(await tableExists(db, TABLE)).toBe(true)
        expect(await primaryKeyColumns(db, TABLE)).toEqual(['id'])
        expect(await columnNames(db, TABLE)).toEqual(
            [
                'id',
                'created_at',
                'last_used_at',
                'network_id',
                'user_id',
                'digest',
                'email',
                'name',
            ].sort()
        )

        const cols = await listColumns(db, TABLE)
        const byName = new Map(cols.map((c) => [c.name, c]))
        expect(byName.get('digest')?.nullable).toBe(false)
        expect(byName.get('name')?.nullable).toBe(false)
        expect(byName.get('user_id')?.nullable).toBe(false)
        expect(byName.get('email')?.nullable).toBe(true)
        expect(byName.get('network_id')?.nullable).toBe(false)
        expect(byName.get('created_at')?.nullable).toBe(false)
        expect(byName.get('last_used_at')?.nullable).toBe(true)
    })

    test('down drops api_keys table', async () => {
        const db = getDb()
        await migrateUpThrough(db, TARGET)

        await insertApiKey(db, {
            id: 'api-key-1',
            digest: 'digest-1',
            name: 'API Key 1',
            userId: 'user-1',
            email: 'user1@example.com',
            networkId: 'net1',
            createdAt: '2026-05-08T13:00:00.000Z',
            lastUsedAt: '2026-05-09T14:00:00.000Z',
        })

        await migrateDownThrough(db, TARGET)

        expect(await tableExists(db, TABLE)).toBe(false)
    })
})
