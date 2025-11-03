// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely, sql } from 'kysely'
import { DB } from '../schema.js'

export async function up(db: Kysely<DB>): Promise<void> {
    // --- wallets ---
    await db.schema
        .createTable('wallets_temp')
        .ifNotExists()
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('party_id', 'text')
        .addColumn('primary', 'boolean', (col) =>
            col.notNull().defaultTo(false)
        )
        .addColumn('hint', 'text', (col) => col.notNull())
        .addColumn('public_key', 'text', (col) => col.notNull())
        .addColumn('namespace', 'text', (col) => col.notNull())
        .addColumn('user_id', 'text', (col) => col.notNull())
        .addColumn('chain_id', 'text', (col) =>
            col.references('networks.chain_id').onDelete('cascade')
        )
        .addColumn('signing_provider_id', 'text', (col) => col.notNull())
        .addColumn('tx_id', 'text')
        .addColumn('transactions', 'text')
        .execute()

    await sql`
        INSERT INTO wallets_temp (party_id, "primary", hint, public_key, "namespace", chain_id, signing_provider_id)
        SELECT party_id, "primary", hint, public_key, "namespace", chain_id, signing_provider_id FROM wallets
    `.execute(db)

    await db.schema.dropTable('wallets').execute()
    await db.schema.alterTable('wallets_temp').renameTo('wallets').execute()
}

export async function down(db: Kysely<DB>): Promise<void> {
    await db.schema
        .createTable('wallets_old')
        .ifNotExists()
        .addColumn('party_id', 'text', (col) => col.primaryKey())
        .addColumn('primary', 'boolean', (col) =>
            col.notNull().defaultTo(false)
        )
        .addColumn('hint', 'text', (col) => col.notNull())
        .addColumn('public_key', 'text', (col) => col.notNull())
        .addColumn('namespace', 'text', (col) => col.notNull())
        .addColumn('user_id', 'text', (col) => col.notNull())
        .addColumn('chain_id', 'text', (col) =>
            col.references('networks.chain_id').onDelete('cascade')
        )
        .addColumn('signing_provider_id', 'text', (col) => col.notNull())
        .execute()

    await sql`
        INSERT INTO wallets_old (party_id, "primary", hint, public_key, "namespace", chain_id, signing_provider_id)
        SELECT party_id, "primary", hint, public_key, "namespace", chain_id, signing_provider_id FROM wallets ON conflict do nothing
    `.execute(db)

    await db.schema.dropTable('wallets').ifExists().execute()
    await db.schema.alterTable('wallets_old').renameTo('wallets').execute()
}
