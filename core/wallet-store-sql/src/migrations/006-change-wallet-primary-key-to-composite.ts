// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely, sql } from 'kysely'
import { DB } from '../schema.js'

async function isPostgres(db: Kysely<DB>): Promise<boolean> {
    try {
        // Try to query PostgreSQL system catalog
        await sql`SELECT 1 FROM pg_database LIMIT 1`.execute(db)
        return true
    } catch {
        return false
    }
}

async function tableExists(
    db: Kysely<DB>,
    tableName: string,
    isPg: boolean
): Promise<boolean> {
    if (isPg) {
        // PostgreSQL
        const result = await sql<{ exists: boolean }>`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = ${tableName}
            ) as exists
        `.execute(db)
        return result.rows[0]?.exists ?? false
    } else {
        // SQLite
        const result = await sql<{ name: string }>`
            SELECT name FROM sqlite_master
            WHERE type='table' AND name = ${tableName}
        `.execute(db)
        return result.rows.length > 0
    }
}

export async function up(db: Kysely<DB>): Promise<void> {
    const isPg = await isPostgres(db)

    if (isPg) {
        // PostgreSQL: Use ALTER TABLE to change primary key
        // First, find and drop the existing primary key constraint
        const constraintResult = await sql<{ constraint_name: string }>`
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_schema = 'public'
            AND table_name = 'wallets'
            AND constraint_type = 'PRIMARY KEY'
        `.execute(db)

        if (constraintResult.rows.length > 0) {
            const constraintName = constraintResult.rows[0].constraint_name
            // Use raw SQL for dynamic constraint name
            await sql
                .raw(`ALTER TABLE wallets DROP CONSTRAINT "${constraintName}"`)
                .execute(db)
        }

        // Add the new composite primary key
        await sql`ALTER TABLE wallets ADD PRIMARY KEY (party_id, network_id)`.execute(
            db
        )
    } else {
        // SQLite: Recreate table (SQLite doesn't support altering primary keys)
        // Drop temporary table if it exists
        await db.schema.dropTable('wallets_new').ifExists().execute()

        const hasWallets = await tableExists(db, 'wallets', isPg)
        const hasWalletsNew = await tableExists(db, 'wallets_new', isPg)

        if (!hasWallets && hasWalletsNew) {
            await db.schema
                .alterTable('wallets_new')
                .renameTo('wallets')
                .execute()
            return
        }

        // Create new table with composite primary key
        await db.schema
            .createTable('wallets_new')
            .addColumn('party_id', 'text', (col) => col.notNull())
            .addColumn('network_id', 'text', (col) =>
                col.references('networks.id').onDelete('cascade').notNull()
            )
            .addColumn('primary', 'boolean', (col) =>
                col.notNull().defaultTo(false)
            )
            .addColumn('hint', 'text', (col) => col.notNull())
            .addColumn('public_key', 'text', (col) => col.notNull())
            .addColumn('namespace', 'text', (col) => col.notNull())
            .addColumn('user_id', 'text', (col) => col.notNull())
            .addColumn('signing_provider_id', 'text', (col) => col.notNull())
            .addColumn('status', 'text')
            .addColumn('external_tx_id', 'text')
            .addColumn('topology_transactions', 'text')
            .addColumn('disabled', 'integer', (col) =>
                col.notNull().defaultTo(0)
            )
            .addColumn('reason', 'text')
            .addPrimaryKeyConstraint('wallets_pk', ['party_id', 'network_id'])
            .execute()

        // Copy data from old table to new table
        await sql`
            INSERT INTO wallets_new (
                party_id, network_id, "primary", hint, public_key, namespace,
                user_id, signing_provider_id, status, external_tx_id,
                topology_transactions, disabled, reason
            )
            SELECT
                party_id, network_id, "primary", hint, public_key, namespace,
                user_id, signing_provider_id, status, external_tx_id,
                topology_transactions, COALESCE(disabled, 0) as disabled, reason
            FROM wallets
        `.execute(db)

        // Drop old table and rename new one
        await db.schema.dropTable('wallets').execute()
        await db.schema.alterTable('wallets_new').renameTo('wallets').execute()
    }
}

export async function down(db: Kysely<DB>): Promise<void> {
    const isPg = await isPostgres(db)

    if (isPg) {
        // PostgreSQL: Use ALTER TABLE to revert to single primary key
        // First, drop the composite primary key
        const constraintResult = await sql<{ constraint_name: string }>`
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_schema = 'public'
            AND table_name = 'wallets'
            AND constraint_type = 'PRIMARY KEY'
        `.execute(db)

        if (constraintResult.rows.length > 0) {
            const constraintName = constraintResult.rows[0].constraint_name
            // Use raw SQL for dynamic constraint name
            await sql
                .raw(`ALTER TABLE wallets DROP CONSTRAINT "${constraintName}"`)
                .execute(db)
        }

        // Keep only one wallet per party_id (data loss if duplicates exist)
        // Use DISTINCT ON to pick first row per party_id
        await sql`
            DELETE FROM wallets w1
            WHERE EXISTS (
                SELECT 1
                FROM wallets w2
                WHERE w2.party_id = w1.party_id
                AND w2.network_id < w1.network_id
            )
        `.execute(db)

        // Make network_id nullable (it was nullable in the original schema)
        await sql`ALTER TABLE wallets ALTER COLUMN network_id DROP NOT NULL`
            .execute(db)
            .catch(() => {
                // Ignore if already nullable
            })

        // Add back the single primary key on party_id
        await sql`ALTER TABLE wallets ADD PRIMARY KEY (party_id)`.execute(db)
    } else {
        // SQLite: Recreate table with single primary key
        // Create old table structure with single primary key
        await db.schema
            .createTable('wallets_new')
            .addColumn('party_id', 'text', (col) => col.primaryKey())
            .addColumn('network_id', 'text', (col) =>
                col.references('networks.id').onDelete('cascade')
            )
            .addColumn('primary', 'boolean', (col) =>
                col.notNull().defaultTo(false)
            )
            .addColumn('hint', 'text', (col) => col.notNull())
            .addColumn('public_key', 'text', (col) => col.notNull())
            .addColumn('namespace', 'text', (col) => col.notNull())
            .addColumn('user_id', 'text', (col) => col.notNull())
            .addColumn('signing_provider_id', 'text', (col) => col.notNull())
            .addColumn('status', 'text')
            .addColumn('external_tx_id', 'text')
            .addColumn('topology_transactions', 'text')
            .addColumn('disabled', 'integer', (col) =>
                col.notNull().defaultTo(0)
            )
            .addColumn('reason', 'text')
            .execute()

        // Keep only one wallet per party_id (data loss if duplicates exist)
        // SQLite: Use rowid
        await sql`
            INSERT INTO wallets_new (
                party_id, network_id, "primary", hint, public_key, namespace,
                user_id, signing_provider_id, status, external_tx_id,
                topology_transactions, disabled, reason
            )
            SELECT
                w.party_id, w.network_id, w."primary", w.hint, w.public_key, w.namespace,
                w.user_id, w.signing_provider_id, w.status, w.external_tx_id,
                w.topology_transactions, w.disabled, w.reason
            FROM wallets w
            INNER JOIN (
                SELECT party_id, MIN(rowid) as min_rowid
                FROM wallets
                GROUP BY party_id
            ) ranked ON w.party_id = ranked.party_id AND w.rowid = ranked.min_rowid
        `.execute(db)

        await db.schema.dropTable('wallets').execute()
        await db.schema.alterTable('wallets_new').renameTo('wallets').execute()
    }
}
