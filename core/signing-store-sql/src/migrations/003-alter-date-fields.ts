// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely, sql } from 'kysely'
import { DB } from '../schema.js'

export async function up(db: Kysely<DB>): Promise<void> {
    console.log('Altering date fields to text (SQLite compatible)')

    // --- signing_transactions ---
    // Create temporary table with new schema
    await db.schema
        .createTable('signing_transactions_tmp')
        .addColumn('id', 'text', (col) => col.primaryKey())
        .addColumn('user_id', 'text', (col) => col.notNull())
        .addColumn('hash', 'text', (col) => col.notNull())
        .addColumn('signature', 'text')
        .addColumn('public_key', 'text', (col) => col.notNull())
        .addColumn('status', 'text', (col) => col.notNull())
        .addColumn('metadata', 'text')
        .addColumn('created_at', 'text', (col) => col.notNull())
        .addColumn('updated_at', 'text', (col) => col.notNull())
        .addColumn('signed_at', 'text')
        .addUniqueConstraint('signing_transactions_user_id_id_unique', [
            'user_id',
            'id',
        ])
        .execute()

    // Copy data, converting integer timestamps to text
    // Check if signed_at column exists
    const tableInfo = await sql<{ name: string }>`
        SELECT name FROM pragma_table_info('signing_transactions') WHERE name = 'signed_at'
    `.execute(db)

    const hasSignedAt = tableInfo.rows.length > 0

    if (hasSignedAt) {
        await sql`
            INSERT INTO signing_transactions_tmp
            SELECT
                id,
                user_id,
                hash,
                signature,
                public_key,
                status,
                metadata,
                CAST(created_at AS TEXT) as created_at,
                CAST(updated_at AS TEXT) as updated_at,
                signed_at
            FROM signing_transactions
        `.execute(db)
    } else {
        await sql`
            INSERT INTO signing_transactions_tmp
            SELECT
                id,
                user_id,
                hash,
                signature,
                public_key,
                status,
                metadata,
                CAST(created_at AS TEXT) as created_at,
                CAST(updated_at AS TEXT) as updated_at,
                NULL as signed_at
            FROM signing_transactions
        `.execute(db)
    }

    // Drop old table
    await db.schema.dropTable('signing_transactions').execute()

    // Rename temporary table
    await db.schema
        .alterTable('signing_transactions_tmp')
        .renameTo('signing_transactions')
        .execute()

    // Recreate indexes
    await db.schema
        .createIndex('idx_signing_transactions_user_id')
        .on('signing_transactions')
        .column('user_id')
        .execute()

    await db.schema
        .createIndex('idx_signing_transactions_status')
        .on('signing_transactions')
        .column('status')
        .execute()

    await db.schema
        .createIndex('idx_signing_transactions_created_at')
        .on('signing_transactions')
        .column('created_at')
        .execute()

    // --- signing_keys ---
    // Create temporary table with new schema
    await db.schema
        .createTable('signing_keys_tmp')
        .addColumn('id', 'text', (col) => col.primaryKey())
        .addColumn('user_id', 'text', (col) => col.notNull())
        .addColumn('name', 'text', (col) => col.notNull())
        .addColumn('public_key', 'text', (col) => col.notNull())
        .addColumn('private_key', 'text')
        .addColumn('metadata', 'text')
        .addColumn('created_at', 'text', (col) => col.notNull())
        .addColumn('updated_at', 'text', (col) => col.notNull())
        .addUniqueConstraint('signing_keys_user_id_id_unique', [
            'user_id',
            'id',
        ])
        .execute()

    // Copy data, converting integer timestamps to text
    await sql`
        INSERT INTO signing_keys_tmp
        SELECT
            id,
            user_id,
            name,
            public_key,
            private_key,
            metadata,
            CAST(created_at AS TEXT) as created_at,
            CAST(updated_at AS TEXT) as updated_at
        FROM signing_keys
    `.execute(db)

    // Drop old table
    await db.schema.dropTable('signing_keys').execute()

    // Rename temporary table
    await db.schema
        .alterTable('signing_keys_tmp')
        .renameTo('signing_keys')
        .execute()

    // Recreate indexes
    await db.schema
        .createIndex('idx_signing_keys_user_id')
        .on('signing_keys')
        .column('user_id')
        .execute()

    await db.schema
        .createIndex('idx_signing_keys_public_key')
        .on('signing_keys')
        .column('public_key')
        .execute()
}

export async function down(db: Kysely<DB>): Promise<void> {
    console.log('Reverting date fields to integer (SQLite compatible)')

    // --- signing_transactions ---
    // Create temporary table with old schema
    await db.schema
        .createTable('signing_transactions_tmp')
        .addColumn('id', 'text', (col) => col.primaryKey())
        .addColumn('user_id', 'text', (col) => col.notNull())
        .addColumn('hash', 'text', (col) => col.notNull())
        .addColumn('signature', 'text')
        .addColumn('public_key', 'text', (col) => col.notNull())
        .addColumn('status', 'text', (col) => col.notNull())
        .addColumn('metadata', 'text')
        .addColumn('created_at', 'integer', (col) => col.notNull())
        .addColumn('updated_at', 'integer', (col) => col.notNull())
        .addColumn('signed_at', 'text')
        .addUniqueConstraint('signing_transactions_user_id_id_unique', [
            'user_id',
            'id',
        ])
        .execute()

    // Copy data, converting text timestamps to integer
    // Check if signed_at column exists
    const tableInfo = await sql<{ name: string }>`
        SELECT name FROM pragma_table_info('signing_transactions') WHERE name = 'signed_at'
    `.execute(db)

    const hasSignedAt = tableInfo.rows.length > 0

    if (hasSignedAt) {
        await sql`
            INSERT INTO signing_transactions_tmp
            SELECT
                id,
                user_id,
                hash,
                signature,
                public_key,
                status,
                metadata,
                CAST(created_at AS INTEGER) as created_at,
                CAST(updated_at AS INTEGER) as updated_at,
                signed_at
            FROM signing_transactions
        `.execute(db)
    } else {
        await sql`
            INSERT INTO signing_transactions_tmp
            SELECT
                id,
                user_id,
                hash,
                signature,
                public_key,
                status,
                metadata,
                CAST(created_at AS INTEGER) as created_at,
                CAST(updated_at AS INTEGER) as updated_at,
                NULL as signed_at
            FROM signing_transactions
        `.execute(db)
    }

    // Drop old table
    await db.schema.dropTable('signing_transactions').execute()

    // Rename temporary table
    await db.schema
        .alterTable('signing_transactions_tmp')
        .renameTo('signing_transactions')
        .execute()

    // Recreate indexes
    await db.schema
        .createIndex('idx_signing_transactions_user_id')
        .on('signing_transactions')
        .column('user_id')
        .execute()

    await db.schema
        .createIndex('idx_signing_transactions_status')
        .on('signing_transactions')
        .column('status')
        .execute()

    await db.schema
        .createIndex('idx_signing_transactions_created_at')
        .on('signing_transactions')
        .column('created_at')
        .execute()

    // --- signing_keys ---
    // Create temporary table with old schema
    await db.schema
        .createTable('signing_keys_tmp')
        .addColumn('id', 'text', (col) => col.primaryKey())
        .addColumn('user_id', 'text', (col) => col.notNull())
        .addColumn('name', 'text', (col) => col.notNull())
        .addColumn('public_key', 'text', (col) => col.notNull())
        .addColumn('private_key', 'text')
        .addColumn('metadata', 'text')
        .addColumn('created_at', 'integer', (col) => col.notNull())
        .addColumn('updated_at', 'integer', (col) => col.notNull())
        .addUniqueConstraint('signing_keys_user_id_id_unique', [
            'user_id',
            'id',
        ])
        .execute()

    // Copy data, converting text timestamps to integer
    await sql`
        INSERT INTO signing_keys_tmp
        SELECT
            id,
            user_id,
            name,
            public_key,
            private_key,
            metadata,
            CAST(created_at AS INTEGER) as created_at,
            CAST(updated_at AS INTEGER) as updated_at
        FROM signing_keys
    `.execute(db)

    // Drop old table
    await db.schema.dropTable('signing_keys').execute()

    // Rename temporary table
    await db.schema
        .alterTable('signing_keys_tmp')
        .renameTo('signing_keys')
        .execute()

    // Recreate indexes
    await db.schema
        .createIndex('idx_signing_keys_user_id')
        .on('signing_keys')
        .column('user_id')
        .execute()

    await db.schema
        .createIndex('idx_signing_keys_public_key')
        .on('signing_keys')
        .column('public_key')
        .execute()
}
