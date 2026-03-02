// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely } from 'kysely'
import { DB } from '../schema.js'

export async function up(db: Kysely<DB>): Promise<void> {
    console.log('Running signing drivers migration...')

    // --- signing_keys ---
    await db.schema
        .createTable('signing_keys')
        .ifNotExists()
        .addColumn('id', 'text', (col) => col.primaryKey())
        .addColumn('user_id', 'text', (col) => col.notNull())
        .addColumn('name', 'text', (col) => col.notNull())
        .addColumn('public_key', 'text', (col) => col.notNull())
        .addColumn('private_key', 'text') // Encrypted for internal driver
        .addColumn('metadata', 'text') // JSON string for driver-specific data
        .addColumn('created_at', 'integer', (col) => col.notNull())
        .addColumn('updated_at', 'integer', (col) => col.notNull())
        .addUniqueConstraint('signing_keys_user_id_id_unique', [
            'user_id',
            'id',
        ])
        .execute()

    // --- signing_transactions ---
    await db.schema
        .createTable('signing_transactions')
        .ifNotExists()
        .addColumn('id', 'text', (col) => col.primaryKey())
        .addColumn('user_id', 'text', (col) => col.notNull())
        .addColumn('hash', 'text', (col) => col.notNull())
        .addColumn('signature', 'text')
        .addColumn('public_key', 'text', (col) => col.notNull())
        .addColumn('status', 'text', (col) => col.notNull())
        .addColumn('metadata', 'text') // JSON string for driver-specific data
        .addColumn('created_at', 'integer', (col) => col.notNull())
        .addColumn('updated_at', 'integer', (col) => col.notNull())
        .addUniqueConstraint('signing_transactions_user_id_id_unique', [
            'user_id',
            'id',
        ])
        .execute()

    // --- signing_driver_configs ---
    await db.schema
        .createTable('signing_driver_configs')
        .ifNotExists()
        .addColumn('user_id', 'text', (col) => col.notNull())
        .addColumn('driver_id', 'text', (col) => col.notNull())
        .addColumn('config', 'text', (col) => col.notNull()) // JSON string
        .addPrimaryKeyConstraint('signing_driver_configs_pk', [
            'user_id',
            'driver_id',
        ])
        .execute()

    // Create indexes for performance
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
}

export async function down(db: Kysely<DB>): Promise<void> {
    await db.schema.dropTable('signing_driver_configs').ifExists().execute()
    await db.schema.dropTable('signing_transactions').ifExists().execute()
    await db.schema.dropTable('signing_keys').ifExists().execute()
}
