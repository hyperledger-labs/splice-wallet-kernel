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
import { insertMessageRaw as insertMessageRaw012 } from '../seeds/012-add-messages-to-sign'
import { insertMessageRaw as insertMessageRaw020 } from '../seeds/020-add-message-external-tx-id-and-failure-reason'

const TARGET = 20
const TABLE = 'messages_raw'

forEachDialect(
    'migration 020 - message external_tx_id and failure_reason',
    ({ getDb }) => {
        test('adds nullable external_tx_id and failure_reason and preserves existing rows', async () => {
            const db = getDb()
            await migrateUpToBefore(db, TARGET)

            await insertMessageRaw012(db, {
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
            expect(byName.get('external_tx_id')?.nullable).toBe(true)
            expect(byName.get('failure_reason')?.nullable).toBe(true)

            const rows = await sql`
                SELECT id, external_tx_id, failure_reason FROM messages_raw
            `.execute(db)
            expect(rows.rows).toHaveLength(1)
            expect(rows.rows[0]).toMatchObject({
                id: 'msg-1',
                externalTxId: null,
                failureReason: null,
            })
        })

        test('down removes external_tx_id and failure_reason and preserves existing rows', async () => {
            const db = getDb()
            await migrateUpThrough(db, TARGET)

            await insertMessageRaw020(db, {
                id: 'msg-2',
                status: 'failed',
                partyId: 'party::2',
                publicKey: 'pk-2',
                message: 'hello again',
                userId: 'user1',
                networkId: 'net1',
                createdAt: '2026-05-08T13:00:00.000Z',
                externalTxId: 'signing-provider-req-id',
                failureReason: 'Signing provider returned status: rejected',
            })

            await migrateDownThrough(db, TARGET)

            expect(await hasColumn(db, TABLE, 'external_tx_id')).toBe(false)
            expect(await hasColumn(db, TABLE, 'failure_reason')).toBe(false)

            const rows = await sql`
                SELECT * FROM messages_raw
            `.execute(db)
            expect(rows.rows).toHaveLength(1)
            expect(rows.rows[0]).toMatchObject({
                id: 'msg-2',
                userId: 'user1',
                message: 'hello again',
            })
            expect(rows.rows[0]).not.toHaveProperty('externalTxId')
            expect(rows.rows[0]).not.toHaveProperty('external_tx_id')
            expect(rows.rows[0]).not.toHaveProperty('failureReason')
            expect(rows.rows[0]).not.toHaveProperty('failure_reason')
        })
    }
)
