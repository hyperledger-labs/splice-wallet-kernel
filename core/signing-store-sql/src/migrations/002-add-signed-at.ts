// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely } from 'kysely'
import { DB } from '../schema.js'

export async function up(db: Kysely<DB>): Promise<void> {
    console.log('Adding signedAt column to signing_transactions table')

    await db.schema
        .alterTable('signing_transactions')
        .addColumn('signed_at', 'text')
        .execute()
}

export async function down(db: Kysely<DB>): Promise<void> {
    await db.schema
        .alterTable('signing_transactions')
        .dropColumn('signed_at')
        .execute()
}
