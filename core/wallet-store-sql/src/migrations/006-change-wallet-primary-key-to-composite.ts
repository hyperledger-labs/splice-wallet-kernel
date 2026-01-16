// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely, sql } from 'kysely'
import { DB } from '../schema.js'

export async function up(db: Kysely<DB>): Promise<void> {
    // SQLite doesn't support altering primary keys directly, so we need to:
    // 1. Create a new table with the composite primary key
    // 2. Copy data from old table
    // 3. Drop old table
    // 4. Rename new table

    // Create new wallets table with composite primary key
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
        .addColumn('disabled', 'integer', (col) => col.notNull().defaultTo(0))
        .addColumn('reason', 'text')
        .addPrimaryKeyConstraint('wallets_pk', ['party_id', 'network_id'])
        .execute()

    // Copy data from old table to new table using raw SQL
    // (wallets_new is not in the DB type, so we use raw SQL)
    await sql`
        INSERT INTO wallets_new (
            party_id, network_id, "primary", hint, public_key, namespace,
            user_id, signing_provider_id, status, external_tx_id,
            topology_transactions, disabled, reason
        )
        SELECT 
            party_id, network_id, "primary", hint, public_key, namespace,
            user_id, signing_provider_id, status, external_tx_id,
            topology_transactions, disabled, reason
        FROM wallets
    `.execute(db)

    // Drop old table
    await db.schema.dropTable('wallets').execute()

    // Rename new table to wallets
    await db.schema.alterTable('wallets_new').renameTo('wallets').execute()
}

export async function down(db: Kysely<DB>): Promise<void> {
    // Reverse the migration: change back to single-column primary key

    // Create new wallets table with single-column primary key
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
        .addColumn('disabled', 'integer', (col) => col.notNull().defaultTo(0))
        .addColumn('reason', 'text')
        .execute()

    // Copy data from composite key table to single key table
    // Note: If there are duplicate party_ids across networks, we'll only keep one
    // This is a data loss scenario, but necessary for rollback
    // We use raw SQL to select one row per party_id (the one with minimum rowid)
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

    // Drop composite key table
    await db.schema.dropTable('wallets').execute()

    // Rename new table to wallets
    await db.schema.alterTable('wallets_new').renameTo('wallets').execute()
}
