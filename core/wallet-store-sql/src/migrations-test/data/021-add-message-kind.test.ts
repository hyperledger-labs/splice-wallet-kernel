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
import { insertMessageRaw as insertMessageRaw020 } from '../seeds/020-add-message-external-tx-id-and-failure-reason'
import { insertMessageRaw as insertMessageRaw021 } from '../seeds/021-add-message-kind'

const TARGET = 21
const TABLE = 'messages_raw'

forEachDialect('migration 021 - message kind', ({ getDb }) => {
    test("adds kind (NOT NULL, default 'regular') and preserves existing rows", async () => {
        const db = getDb()
        await migrateUpToBefore(db, TARGET)

        await insertMessageRaw020(db, {
            id: 'msg-1',
            status: 'pending',
            partyId: 'party::1',
            publicKey: 'pk-1',
            message: 'hello',
            userId: 'user1',
            networkId: 'net1',
            createdAt: '2026-05-08T13:00:00.000Z',
        })

        await migrateUpThrough(db, TARGET)

        const cols = await listColumns(db, TABLE)
        const byName = new Map(cols.map((c) => [c.name, c]))
        expect(byName.get('kind')?.nullable).toBe(false)

        const rows = await sql`
            SELECT id, kind FROM messages_raw
        `.execute(db)
        expect(rows.rows).toHaveLength(1)
        expect(rows.rows[0]).toMatchObject({ id: 'msg-1', kind: 'regular' })
    })

    test('down removes kind and preserves existing rows', async () => {
        const db = getDb()
        await migrateUpThrough(db, TARGET)

        await insertMessageRaw021(db, {
            id: 'msg-2',
            kind: 'self-issued-token',
            status: 'pending',
            partyId: 'party::2',
            publicKey: 'pk-2',
            message: 'header.payload',
            userId: 'user1',
            networkId: 'net1',
            createdAt: '2026-05-08T13:00:00.000Z',
        })

        await migrateDownThrough(db, TARGET)

        expect(await hasColumn(db, TABLE, 'kind')).toBe(false)

        const rows = await sql`
            SELECT * FROM messages_raw
        `.execute(db)
        expect(rows.rows).toHaveLength(1)
        expect(rows.rows[0]).toMatchObject({
            id: 'msg-2',
            userId: 'user1',
            message: 'header.payload',
        })
        expect(rows.rows[0]).not.toHaveProperty('kind')
    })
})
