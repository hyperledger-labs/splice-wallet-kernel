// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely, sql } from 'kysely'
import { DB } from '../schema.js'

async function isPostgres(db: Kysely<DB>): Promise<boolean> {
    try {
        await sql`SELECT 1 FROM pg_database LIMIT 1`.execute(db)
        return true
    } catch {
        return false
    }
}

export async function up(db: Kysely<DB>): Promise<void> {
    const isPg = await isPostgres(db)

    // Cleanup duplicate primary wallets (keep first per network/user)
    if (isPg) {
        // PostgreSQL
        await sql`
            UPDATE wallets w
            SET "primary" = false
            FROM (
                SELECT party_id, network_id, user_id,
                       ROW_NUMBER() OVER (PARTITION BY network_id, user_id ORDER BY party_id) as rn
                FROM wallets
                WHERE "primary" = true
            ) ranked
            WHERE w.party_id = ranked.party_id
            AND w.network_id = ranked.network_id
            AND w.user_id = ranked.user_id
            AND ranked.rn > 1
            AND w."primary" = true
        `.execute(db)
    } else {
        // SQLite
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
    }

    // Ensure only one primary wallet per network per user
    if (isPg) {
        // PostgreSQL
        await sql`
            CREATE UNIQUE INDEX IF NOT EXISTS wallets_one_primary_per_network_user
            ON wallets(network_id, user_id)
            WHERE "primary" = true
        `.execute(db)
    } else {
        // SQLite
        await sql`
            CREATE UNIQUE INDEX IF NOT EXISTS wallets_one_primary_per_network_user
            ON wallets(network_id, user_id)
            WHERE "primary" = 1
        `.execute(db)
    }
}

export async function down(db: Kysely<DB>): Promise<void> {
    await sql`
        DROP INDEX IF EXISTS wallets_one_primary_per_network_user
    `.execute(db)
}
