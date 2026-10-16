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
import { insertIdp, insertNetwork } from '../seeds/001-init'
import { insertWallet } from '../seeds/005-add-wallet-disabled-reason'

const TARGET = 18

forEachDialect('migration 018 - add wallet isAuthParty', ({ getDb }) => {
    test('adds is_auth_party (NOT NULL, default false) and preserves existing rows', async () => {
        const db = getDb()
        await migrateUpToBefore(db, TARGET)

        await insertIdp(db, { id: 'idp1' })
        await insertNetwork(db, { id: 'net1', idpId: 'idp1' })
        await insertWallet(db, {
            partyId: 'party-1',
            userId: 'user1',
            networkId: 'net1',
        })

        await migrateUpThrough(db, TARGET)

        const cols = await listColumns(db, 'wallets')
        const byName = new Map(cols.map((c) => [c.name, c]))
        expect(byName.get('is_auth_party')?.nullable).toBe(false)

        const rows = await sql<{
            partyId: string
            isAuthParty: boolean | number
        }>`
            SELECT party_id, is_auth_party FROM wallets
        `.execute(db)
        expect(rows.rows).toHaveLength(1)
        expect(rows.rows[0]?.partyId).toBe('party-1')
        expect(
            rows.rows[0]?.isAuthParty === false ||
                rows.rows[0]?.isAuthParty === 0
        ).toBe(true)
    })

    test('down removes the is_auth_party column and preserves existing rows', async () => {
        const db = getDb()
        await migrateUpThrough(db, TARGET)
        await insertIdp(db, { id: 'idp1' })
        await insertNetwork(db, { id: 'net1', idpId: 'idp1' })
        await insertWallet(db, {
            partyId: 'party-2',
            userId: 'user1',
            networkId: 'net1',
        })

        await migrateDownThrough(db, TARGET)

        expect(await hasColumn(db, 'wallets', 'is_auth_party')).toBe(false)

        const rows = await sql`SELECT * FROM wallets`.execute(db)
        expect(rows.rows).toHaveLength(1)
        expect(rows.rows[0]).toMatchObject({
            partyId: 'party-2',
            userId: 'user1',
            networkId: 'net1',
        })
        expect(rows.rows[0]).not.toHaveProperty('isAuthParty')
        expect(rows.rows[0]).not.toHaveProperty('is_auth_party')
    })
})
