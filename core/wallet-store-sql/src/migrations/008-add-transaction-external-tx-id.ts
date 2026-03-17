// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely } from 'kysely'
import { DB } from '../schema.js'

export async function up(db: Kysely<DB>): Promise<void> {
    console.log('Adding external_tx_id column to transactions table')

    await db.schema
        .alterTable('transactions')
        .addColumn('external_tx_id', 'text')
        .execute()
}

export async function down(db: Kysely<DB>): Promise<void> {
    console.log('Dropping external_tx_id column from transactions table')

    await db.schema
        .alterTable('transactions')
        .dropColumn('external_tx_id')
        .execute()
}
