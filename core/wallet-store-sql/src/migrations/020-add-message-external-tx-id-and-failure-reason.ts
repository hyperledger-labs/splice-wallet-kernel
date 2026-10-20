// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Kysely } from 'kysely'
import type { DB } from '../schema.js'

export async function up(db: Kysely<DB>): Promise<void> {
    await db.schema
        .alterTable('messagesRaw')
        .addColumn('externalTxId', 'text')
        .execute()
    await db.schema
        .alterTable('messagesRaw')
        .addColumn('failureReason', 'text')
        .execute()
}

export async function down(db: Kysely<DB>): Promise<void> {
    await db.schema
        .alterTable('messagesRaw')
        .dropColumn('failureReason')
        .execute()
    await db.schema
        .alterTable('messagesRaw')
        .dropColumn('externalTxId')
        .execute()
}
