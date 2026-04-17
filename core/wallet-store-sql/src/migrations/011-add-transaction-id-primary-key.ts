// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { randomUUID } from 'node:crypto'
import { Kysely, sql } from 'kysely'
import { DB } from '../schema.js'
import { isPostgres } from '../utils.js'

export async function up(db: Kysely<DB>): Promise<void> {
    console.log('Migrating transactions primary key from command_id to id')

    const pg = await isPostgres(db)
    if (pg) {
        await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`.execute(db)

        await sql`ALTER TABLE transactions ADD COLUMN id UUID`.execute(db)
        await sql`UPDATE transactions SET id = gen_random_uuid() WHERE id IS NULL`.execute(
            db
        )
        await sql`ALTER TABLE transactions ALTER COLUMN id SET NOT NULL`.execute(
            db
        )
        await sql`ALTER TABLE transactions ALTER COLUMN id SET DEFAULT gen_random_uuid()`.execute(
            db
        )
        await sql`ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_pkey`.execute(
            db
        )
        await sql`ALTER TABLE transactions ADD CONSTRAINT transactions_pkey PRIMARY KEY (id)`.execute(
            db
        )
        await sql`
            CREATE INDEX IF NOT EXISTS transactions_command_user_network_idx
            ON transactions (command_id, user_id, network_id)
        `.execute(db)
        return
    }

    await db.schema.dropTable('transactions_new').ifExists().execute()

    await db.schema
        .createTable('transactions_new')
        .addColumn('id', 'text', (col) => col.primaryKey().notNull())
        .addColumn('command_id', 'text', (col) => col.notNull())
        .addColumn('status', 'text', (col) => col.notNull())
        .addColumn('prepared_transaction', 'text', (col) => col.notNull())
        .addColumn('prepared_transaction_hash', 'text', (col) => col.notNull())
        .addColumn('payload', 'text')
        .addColumn('origin', 'text')
        .addColumn('user_id', 'text', (col) => col.notNull())
        .addColumn('network_id', 'text', (col) =>
            col.references('networks.id').onDelete('cascade').notNull()
        )
        .addColumn('created_at', 'text')
        .addColumn('signed_at', 'text')
        .addColumn('external_tx_id', 'text')
        .execute()

    const transactions = await db
        .selectFrom('transactions')
        .selectAll()
        .execute()

    for (const transaction of transactions) {
        await sql`
            INSERT INTO transactions_new (
                id,
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
            VALUES (
                ${randomUUID()},
                ${transaction.commandId},
                ${transaction.status},
                ${transaction.preparedTransaction},
                ${transaction.preparedTransactionHash},
                ${transaction.payload},
                ${transaction.origin},
                ${transaction.userId},
                ${transaction.networkId},
                ${transaction.createdAt},
                ${transaction.signedAt},
                ${transaction.externalTxId}
            )
        `.execute(db)
    }

    await sql`
        CREATE INDEX transactions_command_user_network_idx
        ON transactions_new (command_id, user_id, network_id)
    `.execute(db)

    await db.schema.dropTable('transactions').execute()
    await db.schema
        .alterTable('transactions_new')
        .renameTo('transactions')
        .execute()
}

export async function down(db: Kysely<DB>): Promise<void> {
    console.log('Reverting transactions primary key from id to command_id')

    const pg = await isPostgres(db)
    if (pg) {
        await sql`
            DROP INDEX IF EXISTS transactions_command_user_network_idx
        `.execute(db)
        await sql`
            UPDATE transactions
            SET command_id = command_id || ':' || id
        `.execute(db)
        await sql`ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_pkey`.execute(
            db
        )
        await sql`ALTER TABLE transactions ADD CONSTRAINT transactions_pkey PRIMARY KEY (command_id)`.execute(
            db
        )
        await sql`ALTER TABLE transactions DROP COLUMN id`.execute(db)
        return
    }

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
        .addColumn('network_id', 'text', (col) =>
            col.references('networks.id').onDelete('cascade').notNull()
        )
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
            command_id || ':' || id,
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
