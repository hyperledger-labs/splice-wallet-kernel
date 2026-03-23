// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely, sql } from 'kysely'
import { DB } from '../schema.js'
import { isPostgres } from '../utils.js'

export async function up(db: Kysely<DB>): Promise<void> {
    console.log('Adding network_id column to transactions table')

    await db.schema
        .alterTable('transactions')
        .addColumn('network_id', 'text')
        .execute()

    // Backfill by user-owned network; if multiple exist pick first by id.
    await sql`
        UPDATE transactions
        SET network_id = COALESCE(
            (
                SELECT n.id
                FROM networks n
                WHERE n.user_id = transactions.user_id
                ORDER BY n.id
                LIMIT 1
            ),
            (
                SELECT n2.id
                FROM networks n2
                ORDER BY n2.id
                LIMIT 1
            )
        )
        WHERE network_id IS NULL
    `.execute(db)

    const pg = await isPostgres(db)
    if (pg) {
        await sql`
            ALTER TABLE transactions
            ALTER COLUMN network_id SET NOT NULL
        `.execute(db)
        return
    }

    // SQLite: recreate table to enforce NOT NULL on network_id.
    await db.schema.dropTable('transactions_new').ifExists().execute()

    await db.schema
        .createTable('transactions_new')
        .addColumn('command_id', 'text', (col) => col.primaryKey())
        .addColumn('status', 'text', (col) => col.notNull())
        .addColumn('prepared_transaction', 'text', (col) => col.notNull())
        .addColumn('prepared_transaction_hash', 'text', (col) => col.notNull())
        .addColumn('payload', 'text')
        .addColumn('origin', 'text')
        .addColumn('user_id', 'text', (col) => col.notNull())
        .addColumn('network_id', 'text', (col) => col.notNull())
        .addColumn('created_at', 'text')
        .addColumn('signed_at', 'text')
        .addColumn('external_tx_id', 'text')
        .execute()

    await sql`
        INSERT INTO transactions_new (
            command_id,
            status,
            prepared_transaction,
            prepared_transaction_hash,
            payload,
            origin,
            user_id,
            network_id,
            created_at,
            signed_at,
            external_tx_id
        )
        SELECT
            command_id,
            status,
            prepared_transaction,
            prepared_transaction_hash,
            payload,
            origin,
            user_id,
            network_id,
            created_at,
            signed_at,
            external_tx_id
        FROM transactions
    `.execute(db)

    await db.schema.dropTable('transactions').execute()
    await db.schema
        .alterTable('transactions_new')
        .renameTo('transactions')
        .execute()
}

export async function down(db: Kysely<DB>): Promise<void> {
    console.log('Dropping network_id column from transactions table')

    const pg = await isPostgres(db)
    if (pg) {
        await sql`
            ALTER TABLE transactions
            DROP COLUMN network_id
        `.execute(db)
        return
    }

    // SQLite: recreate table without network_id.
    await db.schema.dropTable('transactions_new').ifExists().execute()

    await db.schema
        .createTable('transactions_new')
        .addColumn('command_id', 'text', (col) => col.primaryKey())
        .addColumn('status', 'text', (col) => col.notNull())
        .addColumn('prepared_transaction', 'text', (col) => col.notNull())
        .addColumn('prepared_transaction_hash', 'text', (col) => col.notNull())
        .addColumn('payload', 'text')
        .addColumn('origin', 'text')
        .addColumn('user_id', 'text', (col) => col.notNull())
        .addColumn('created_at', 'text')
        .addColumn('signed_at', 'text')
        .addColumn('external_tx_id', 'text')
        .execute()

    await sql`
        INSERT INTO transactions_new (
            command_id,
            status,
            prepared_transaction,
            prepared_transaction_hash,
            payload,
            origin,
            user_id,
            created_at,
            signed_at,
            external_tx_id
        )
        SELECT
            command_id,
            status,
            prepared_transaction,
            prepared_transaction_hash,
            payload,
            origin,
            user_id,
            created_at,
            signed_at,
            external_tx_id
        FROM transactions
    `.execute(db)

    await db.schema.dropTable('transactions').execute()
    await db.schema
        .alterTable('transactions_new')
        .renameTo('transactions')
        .execute()
}
