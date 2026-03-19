// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely } from 'kysely'
import { DB } from '../schema.js'

export async function up(db: Kysely<DB>): Promise<void> {
    console.log('Adding wallet rights columns to wallets table')

    await db.schema
        .alterTable('wallets')
        .addColumn('rights_act_as', 'integer', (col) =>
            col.notNull().defaultTo(0)
        )
        .execute()

    await db.schema
        .alterTable('wallets')
        .addColumn('rights_read_as', 'integer', (col) =>
            col.notNull().defaultTo(0)
        )
        .execute()

    await db.schema
        .alterTable('wallets')
        .addColumn('rights_execute_as', 'integer', (col) =>
            col.notNull().defaultTo(0)
        )
        .execute()
}

export async function down(db: Kysely<DB>): Promise<void> {
    console.log('Dropping wallet rights columns from wallets table')

    await db.schema.alterTable('wallets').dropColumn('rights_act_as').execute()

    await db.schema.alterTable('wallets').dropColumn('rights_read_as').execute()

    await db.schema
        .alterTable('wallets')
        .dropColumn('rights_execute_as')
        .execute()
}
