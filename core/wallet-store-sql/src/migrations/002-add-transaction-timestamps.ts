// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely } from 'kysely'
import { DB } from '../schema.js'

export async function up(db: Kysely<DB>): Promise<void> {
    console.log('Adding createdAt and signedAt columns to transactions table')

    await db.schema
        .alterTable('transactions')
        .addColumn('created_at', 'text')
        .execute()

    await db.schema
        .alterTable('transactions')
        .addColumn('signed_at', 'text')
        .execute()
}

export async function down(db: Kysely<DB>): Promise<void> {
    await db.schema.alterTable('transactions').dropColumn('signed_at').execute()

    await db.schema
        .alterTable('transactions')
        .dropColumn('created_at')
        .execute()
}
