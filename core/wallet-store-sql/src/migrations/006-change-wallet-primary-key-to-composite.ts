// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely, sql } from 'kysely'
import { DB } from '../schema.js'

export async function up(db: Kysely<DB>): Promise<void> {
    // SQLite doesn't support altering primary keys, so recreate table
    await db.schema.dropTable('wallets_new').ifExists().execute()

    const tableInfo = await sql`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name IN ('wallets', 'wallets_new')
    `.execute(db)

    const tableNames = (tableInfo.rows as Array<{ name: string }>).map(
        (row) => row.name
    )
    const hasWallets = tableNames.includes('wallets')
    const hasWalletsNew = tableNames.includes('wallets_new')

    if (!hasWallets && hasWalletsNew) {
        await db.schema.alterTable('wallets_new').renameTo('wallets').execute()
        return
    }

    if (!hasWallets) {
        throw new Error('wallets table does not exist - cannot migrate')
    }

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

    await db.schema.dropTable('wallets').execute()
    await db.schema.alterTable('wallets_new').renameTo('wallets').execute()
}

export async function down(db: Kysely<DB>): Promise<void> {
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

    // Keep only one wallet per party_id (data loss if duplicates exist)
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
