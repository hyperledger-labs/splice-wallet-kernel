// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'
import { sql } from 'kysely'

import {
    forEachDialect,
    listColumns,
    migrateDownThrough,
    migrateUpThrough,
    migrateUpToBefore,
} from '../helpers'
import { insertNetwork } from '../seeds/001-init'
import { insertIdp } from '../seeds/017-make-idp-issuer-nullable'

const TARGET = 17

forEachDialect(
    'migration 017 - nullable identity provider issuer',
    ({ getDb }) => {
        test('allows null issuer and clears it for existing self_issued IdPs', async () => {
            const db = getDb()
            await migrateUpToBefore(db, TARGET)

            await sql`
                INSERT INTO idps (id, type, issuer, config_url)
                VALUES ('self-issued', 'self_issued', '', NULL)
            `.execute(db)
            await insertNetwork(db, {
                id: 'network1',
                idpId: 'self-issued',
            })

            await migrateUpThrough(db, TARGET)

            const columns = await listColumns(db, 'idps')
            expect(
                columns.find((column) => column.name === 'issuer')?.nullable
            ).toBe(true)

            const idps = await sql<{
                id: string
                issuer: string | null
            }>`SELECT id, issuer FROM idps`.execute(db)
            expect(idps.rows).toEqual([{ id: 'self-issued', issuer: null }])

            await insertIdp(db, {
                id: 'another-self-issued',
                type: 'self_issued',
                issuer: null,
            })

            const networks =
                await sql`SELECT id, identity_provider_id FROM networks`.execute(
                    db
                )
            expect(networks.rows).toEqual([
                { id: 'network1', identityProviderId: 'self-issued' },
            ])
        })

        test('restores the non-null constraint when migrated down', async () => {
            const db = getDb()
            await migrateUpThrough(db, TARGET)
            await insertIdp(db, {
                id: 'self-issued',
                type: 'self_issued',
                issuer: null,
            })

            await migrateDownThrough(db, TARGET)

            const columns = await listColumns(db, 'idps')
            expect(
                columns.find((column) => column.name === 'issuer')?.nullable
            ).toBe(false)

            const idps = await sql<{
                issuer: string
            }>`SELECT issuer FROM idps WHERE id = 'self-issued'`.execute(db)
            expect(idps.rows[0]?.issuer).toBe('')
        })
    }
)
