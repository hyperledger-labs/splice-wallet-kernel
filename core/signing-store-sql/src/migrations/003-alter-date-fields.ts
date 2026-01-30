// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely, sql } from 'kysely'
import { DB } from '../schema.js'
import { isPostgres } from '../utils.js'

async function columnExists(
    db: Kysely<DB>,
    tableName: string,
    columnName: string,
    isPg: boolean
): Promise<boolean> {
    if (isPg) {
        const result = await sql<{ exists: boolean }>`
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = ${tableName}
                AND column_name = ${columnName}
            ) as exists
        `.execute(db)
        return result.rows[0]?.exists ?? false
    } else {
        const result = await sql<{ name: string }>`
            SELECT name FROM pragma_table_info(${tableName}) WHERE name = ${columnName}
        `.execute(db)
        return result.rows.length > 0
    }
}

async function dropConstraintIfExists(
    db: Kysely<DB>,
    tableName: string,
    constraintName: string,
    isPg: boolean
): Promise<void> {
    if (isPg) {
        // PostgreSQL: Drop constraint if it exists
        const result = await sql<{ constraint_name: string }>`
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_schema = 'public'
            AND table_name = ${tableName}
            AND constraint_name = ${constraintName}
        `.execute(db)

        if (result.rows.length > 0) {
            const quotedTable = `"${tableName}"`
            const quotedConstraint = `"${constraintName}"`
            await sql
                .raw(
                    `ALTER TABLE ${quotedTable} DROP CONSTRAINT IF EXISTS ${quotedConstraint}`
                )
                .execute(db)
        }
    }
    // SQLite: Constraints are dropped when table is dropped, so no action needed
}

async function dropIndexIfExists(
    db: Kysely<DB>,
    indexName: string,
    tableName: string,
    isPg: boolean
): Promise<void> {
    if (isPg) {
        // PostgreSQL: Drop index by name only (no ON clause)
        await sql.raw(`DROP INDEX IF EXISTS "${indexName}"`).execute(db)
    } else {
        // SQLite: Drop index with ON clause
        await db.schema.dropIndex(indexName).ifExists().on(tableName).execute()
    }
}

export async function up(db: Kysely<DB>): Promise<void> {
    const isPg = await isPostgres(db)
    console.log('Altering date fields to text (SQLite compatible)')

    // Drop temp tables if they exist (from previous failed migrations)
    await db.schema.dropTable('signing_transactions_tmp').ifExists().execute()
    await db.schema.dropTable('signing_keys_tmp').ifExists().execute()

    // For PostgreSQL, drop constraints from original tables before creating temp tables
    // to avoid name conflicts during reset operations
    await dropConstraintIfExists(
        db,
        'signing_transactions',
        'signing_transactions_user_id_id_unique',
        isPg
    )
    await dropConstraintIfExists(
        db,
        'signing_keys',
        'signing_keys_user_id_id_unique',
        isPg
    )

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
    const hasSignedAt = await columnExists(
        db,
        'signing_transactions',
        'signed_at',
        isPg
    )

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
    await dropIndexIfExists(
        db,
        'idx_signing_transactions_user_id',
        'signing_transactions',
        isPg
    )
    await db.schema
        .createIndex('idx_signing_transactions_user_id')
        .on('signing_transactions')
        .column('user_id')
        .execute()

    await dropIndexIfExists(
        db,
        'idx_signing_transactions_status',
        'signing_transactions',
        isPg
    )
    await db.schema
        .createIndex('idx_signing_transactions_status')
        .on('signing_transactions')
        .column('status')
        .execute()

    await dropIndexIfExists(
        db,
        'idx_signing_transactions_created_at',
        'signing_transactions',
        isPg
    )
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
    await dropIndexIfExists(
        db,
        'idx_signing_keys_user_id',
        'signing_keys',
        isPg
    )
    await db.schema
        .createIndex('idx_signing_keys_user_id')
        .on('signing_keys')
        .column('user_id')
        .execute()

    await dropIndexIfExists(
        db,
        'idx_signing_keys_public_key',
        'signing_keys',
        isPg
    )
    await db.schema
        .createIndex('idx_signing_keys_public_key')
        .on('signing_keys')
        .column('public_key')
        .execute()
}

export async function down(db: Kysely<DB>): Promise<void> {
    const isPg = await isPostgres(db)
    console.log('Reverting date fields to integer (SQLite compatible)')

    // Drop temp tables if they exist
    await db.schema.dropTable('signing_transactions_tmp').ifExists().execute()
    await db.schema.dropTable('signing_keys_tmp').ifExists().execute()

    // For PostgreSQL, drop constraints from original tables before creating temp tables
    await dropConstraintIfExists(
        db,
        'signing_transactions',
        'signing_transactions_user_id_id_unique',
        isPg
    )
    await dropConstraintIfExists(
        db,
        'signing_keys',
        'signing_keys_user_id_id_unique',
        isPg
    )

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
    const hasSignedAt = await columnExists(
        db,
        'signing_transactions',
        'signed_at',
        isPg
    )

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
    await dropIndexIfExists(
        db,
        'idx_signing_transactions_user_id',
        'signing_transactions',
        isPg
    )
    await db.schema
        .createIndex('idx_signing_transactions_user_id')
        .on('signing_transactions')
        .column('user_id')
        .execute()

    await dropIndexIfExists(
        db,
        'idx_signing_transactions_status',
        'signing_transactions',
        isPg
    )
    await db.schema
        .createIndex('idx_signing_transactions_status')
        .on('signing_transactions')
        .column('status')
        .execute()

    await dropIndexIfExists(
        db,
        'idx_signing_transactions_created_at',
        'signing_transactions',
        isPg
    )
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
    await dropIndexIfExists(
        db,
        'idx_signing_keys_user_id',
        'signing_keys',
        isPg
    )
    await db.schema
        .createIndex('idx_signing_keys_user_id')
        .on('signing_keys')
        .column('user_id')
        .execute()

    await dropIndexIfExists(
        db,
        'idx_signing_keys_public_key',
        'signing_keys',
        isPg
    )
    await db.schema
        .createIndex('idx_signing_keys_public_key')
        .on('signing_keys')
        .column('public_key')
        .execute()
}
