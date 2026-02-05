// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely } from 'kysely'
import { DB } from '../schema.js'

export async function up(db: Kysely<DB>): Promise<void> {
    // Remove admin_auth column from networks table
    await db.schema.alterTable('networks').dropColumn('admin_auth').execute()
}

export async function down(db: Kysely<DB>): Promise<void> {
    // Re-add admin_auth column if rolling back
    await db.schema
        .alterTable('networks')
        .addColumn('admin_auth', 'jsonb')
        .execute()
}
