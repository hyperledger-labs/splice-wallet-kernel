// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely } from 'kysely'
import { DB } from '../schema.js'

export async function up(db: Kysely<DB>): Promise<void> {
    console.log('Adding session ID column to session table')

    await db.schema.alterTable('sessions').addColumn('id', 'text').execute()
}

export async function down(db: Kysely<DB>): Promise<void> {
    await db.schema.alterTable('sessions').dropColumn('id').execute()
}
