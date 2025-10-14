// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely } from 'kysely'
import { DB } from '../schema.js'

export async function up(db: Kysely<DB>): Promise<void> {
    console.log('Running 002-drop-grpc-url...')

    // --- networks ---
    await db.schema
        .alterTable('networks')
        .dropColumn('ledger_api_admin_grpc_url')
        .execute()
}

export async function down(db: Kysely<DB>): Promise<void> {
    await db.schema
        .alterTable('networks')
        .addColumn('ledger_api_admin_grpc_url', 'text', (col) => col.notNull())
        .execute()
}
