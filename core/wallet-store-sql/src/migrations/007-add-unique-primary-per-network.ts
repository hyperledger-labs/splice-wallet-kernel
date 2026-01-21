// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely, sql } from 'kysely'
import { DB } from '../schema.js'

export async function up(db: Kysely<DB>): Promise<void> {
    // Cleanup duplicate primary wallets (keep first per network/user)
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

    // Ensure only one primary wallet per network per user
    await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS wallets_one_primary_per_network_user
        ON wallets(network_id, user_id)
        WHERE "primary" = 1
    `.execute(db)
}

export async function down(db: Kysely<DB>): Promise<void> {
    await sql`
        DROP INDEX IF EXISTS wallets_one_primary_per_network_user
    `.execute(db)
}
