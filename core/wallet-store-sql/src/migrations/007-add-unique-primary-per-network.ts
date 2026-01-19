// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely, sql } from 'kysely'
import { DB } from '../schema.js'

export async function up(db: Kysely<DB>): Promise<void> {
    // Add a unique constraint to ensure only one primary wallet per network
    // SQLite doesn't support partial unique indexes directly, but we can use a unique index
    // on (network_id, primary) where primary = 1
    //
    // However, SQLite's CREATE UNIQUE INDEX doesn't support WHERE clauses directly.
    // We'll use a workaround: create a unique index on (network_id, primary)
    // and rely on application logic to keep primary = 0 for non-primary wallets.
    //
    // Actually, for SQLite, we can use a partial unique index with a WHERE clause
    // if we use raw SQL, but Kysely doesn't support this directly.
    // Let's use raw SQL to create a partial unique index.

    // First, ensure there's only one primary wallet per network (cleanup any duplicates)
    await sql`
        UPDATE wallets
        SET "primary" = 0
        WHERE rowid NOT IN (
            SELECT MIN(rowid)
            FROM wallets
            WHERE "primary" = 1
            GROUP BY network_id, user_id
        )
        AND "primary" = 1
    `.execute(db)

    // Create a unique index on (network_id, user_id, primary) where primary = 1
    // This ensures only one primary wallet per network per user
    // Note: SQLite supports partial indexes with WHERE clause
    await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS wallets_one_primary_per_network_user 
        ON wallets(network_id, user_id) 
        WHERE "primary" = 1
    `.execute(db)
}

export async function down(db: Kysely<DB>): Promise<void> {
    // Drop the unique index
    await sql`
        DROP INDEX IF EXISTS wallets_one_primary_per_network_user
    `.execute(db)
}
