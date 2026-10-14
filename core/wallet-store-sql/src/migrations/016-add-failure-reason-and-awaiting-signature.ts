// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type Kysely, sql } from 'kysely'
import type { DB } from '../schema.js'

export async function up(db: Kysely<DB>): Promise<void> {
    console.log('Adding failure reason to transaction')

    await db.schema
        .alterTable('transactions')
        .addColumn('failure_reason', 'text')
        .execute()

    await sql`
                UPDATE transactions
                SET status = 'awaiting-signature'
                WHERE status = 'pending' AND external_tx_id IS NOT NULL
            `.execute(db)
}

export async function down(db: Kysely<DB>): Promise<void> {
    console.log('Dropping failure reason to transaction')

    await sql`
                UPDATE transactions
                SET status = 'pending'
                WHERE status = 'awaiting-signature'
            `.execute(db)

    await db.schema
        .alterTable('transactions')
        .dropColumn('failure_reason')
        .execute()
}
