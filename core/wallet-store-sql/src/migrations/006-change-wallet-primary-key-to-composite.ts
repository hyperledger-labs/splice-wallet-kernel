// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely, sql } from 'kysely'
import { DB } from '../schema.js'
import { isPostgres } from '../utils.js'

async function tableExists(
    db: Kysely<DB>,
    tableName: string,
    isPg: boolean
): Promise<boolean> {
    if (isPg) {
        const result = await sql<{ exists: boolean }>`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = ${tableName}
            ) AS exists
    `.execute(db)
        return result.rows[0]?.exists ?? false
    } else {
        const result = await sql<{ name: string }>`
            SELECT name
            FROM sqlite_master
            WHERE type='table' AND name = ${tableName}
        `.execute(db)
        return result.rows.length > 0
    }
}

export async function up(db: Kysely<DB>): Promise<void> {
    const isPg = await isPostgres(db)

    if (isPg) {
        // PostgreSQL: Change PK to (party_id, network_id, user_id)
        // Check if composite PK already exists
        const pkCheck = await sql<{ exists: boolean }>`
            SELECT EXISTS (
                SELECT 1
                FROM pg_constraint c
                WHERE c.conrelid = 'public.wallets'::regclass
                  AND c.contype = 'p'
                  AND pg_get_constraintdef(c.oid) ILIKE 'PRIMARY KEY (party_id, network_id, user_id)%'
            ) AS exists
        `.execute(db)

        if (!pkCheck.rows[0]?.exists) {
            // Drop existing PK if it exists
            await sql`
                DO $$
                DECLARE pk_name text;
                BEGIN
                    SELECT c.conname INTO pk_name
                    FROM pg_constraint c
                    WHERE c.conrelid = 'public.wallets'::regclass
                      AND c.contype = 'p';
                    IF pk_name IS NOT NULL THEN
                        EXECUTE format('ALTER TABLE public.wallets DROP CONSTRAINT %I', pk_name);
                    END IF;
                END $$;
            `.execute(db)

            // Ensure no NULLs in required columns
            const nullCheck = await sql<{ has_nulls: boolean }>`
                SELECT EXISTS (
                    SELECT 1 FROM public.wallets
                    WHERE network_id IS NULL OR user_id IS NULL
                ) AS has_nulls
            `.execute(db)

            if (nullCheck.rows[0]?.has_nulls) {
                throw new Error(
                    'Cannot add composite PK: wallets.network_id or user_id has NULLs'
                )
            }

            // Set columns as NOT NULL
            await sql`ALTER TABLE public.wallets ALTER COLUMN network_id SET NOT NULL`.execute(
                db
            )
            await sql`ALTER TABLE public.wallets ALTER COLUMN user_id SET NOT NULL`.execute(
                db
            )

            // Add composite primary key
            await sql`
                ALTER TABLE public.wallets
                ADD CONSTRAINT wallets_pkey PRIMARY KEY (party_id, network_id, user_id)
            `.execute(db)
        }
    } else {
        // SQLite: Recreate table (SQLite doesn't support altering primary keys)
        // Drop temporary table if it exists
        await db.schema.dropTable('wallets_new').ifExists().execute()

        const hasWallets = await tableExists(db, 'wallets', false)
        const hasWalletsNew = await tableExists(db, 'wallets_new', false)

        if (!hasWallets && hasWalletsNew) {
            await db.schema
                .alterTable('wallets_new')
                .renameTo('wallets')
                .execute()
            return
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
            .addColumn('disabled', 'integer', (col) =>
                col.notNull().defaultTo(0)
            )
            .addColumn('reason', 'text')
            .addPrimaryKeyConstraint('wallets_pk', [
                'party_id',
                'network_id',
                'user_id',
            ])
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
                topology_transactions, COALESCE(disabled, 0) AS disabled, reason
            FROM wallets
        `.execute(db)

        await db.schema.dropTable('wallets').execute()
        await db.schema.alterTable('wallets_new').renameTo('wallets').execute()
    }
}

export async function down(db: Kysely<DB>): Promise<void> {
    const isPg = await isPostgres(db)

    if (isPg) {
        if (!(await tableExists(db, 'wallets', true))) return

        // PostgreSQL: Use ALTER TABLE to revert to single primary key
        // drop the composite primary key
        await sql`
                DO $$
                DECLARE
                  pk_name text;
                BEGIN
                  SELECT c.conname
                    INTO pk_name
                  FROM pg_constraint c
                  WHERE c.conrelid = 'public.wallets'::regclass
                    AND c.contype = 'p';

                  IF pk_name IS NOT NULL THEN
                    EXECUTE format('ALTER TABLE public.wallets DROP CONSTRAINT %I', pk_name);
                  END IF;
                END $$;
      `.execute(db)

        // Keep only one wallet per party_id (data loss if duplicates exist)
        // Use ROW_NUMBER() to keep the first inserted row (using ctid as proxy for insertion order)
        await sql`
            WITH ranked AS (
                SELECT party_id, network_id, user_id,
                       ROW_NUMBER() OVER (PARTITION BY party_id ORDER BY ctid) as rn
                FROM public.wallets
            )
            DELETE FROM public.wallets w
            USING ranked r
            WHERE w.party_id = r.party_id
              AND w.network_id = r.network_id
              AND w.user_id = r.user_id
              AND r.rn > 1
        `.execute(db)

        // Make network_id nullable again
        await sql`
          ALTER TABLE public.wallets
          ALTER COLUMN network_id DROP NOT NULL
      `.execute(db)

        // Add back single-column PK on party_id
        await sql`
          ALTER TABLE public.wallets
          ADD CONSTRAINT wallets_pkey PRIMARY KEY (party_id)
        `.execute(db)
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
        // Use ROW_NUMBER() to keep the first inserted row (using rowid as insertion order)
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
            FROM (
                SELECT *,
                       ROW_NUMBER() OVER (PARTITION BY party_id ORDER BY rowid) as rn
                FROM wallets
            ) ranked
            WHERE rn = 1
        `.execute(db)

        await db.schema.dropTable('wallets').execute()
        await db.schema.alterTable('wallets_new').renameTo('wallets').execute()
    }
}
