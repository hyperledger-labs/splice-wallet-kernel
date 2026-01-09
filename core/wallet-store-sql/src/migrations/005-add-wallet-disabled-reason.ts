// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely } from 'kysely'
import { DB } from '../schema.js'

export async function up(db: Kysely<DB>): Promise<void> {
    await db.schema
        .alterTable('wallets')
        .addColumn('disabled', 'integer')
        .execute()

    await db.schema.alterTable('wallets').addColumn('reason', 'text').execute()
}

export async function down(db: Kysely<DB>): Promise<void> {
    await db.schema.alterTable('wallets').dropColumn('reason').execute()

    await db.schema.alterTable('wallets').dropColumn('disabled').execute()
}
