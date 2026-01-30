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
        // PostgreSQL: idempotent PK change to (party_id, network_id)
        // Drop current PK if it isn't already the composite (party_id, network_id)
        await sql`
            DO $$
            DECLARE
              pk_name text;
              pk_def  text;
            BEGIN
              SELECT c.conname, pg_get_constraintdef(c.oid)
                INTO pk_name, pk_def
              FROM pg_constraint c
              WHERE c.conrelid = 'public.wallets'::regclass
                AND c.contype = 'p';

              IF pk_name IS NOT NULL
                 AND pk_def NOT ILIKE 'PRIMARY KEY (party_id, network_id)%' THEN
                EXECUTE format('ALTER TABLE public.wallets DROP CONSTRAINT %I', pk_name);
              END IF;
            END $$;
      `.execute(db)

        // Ensure network_id has no NULLs and is NOT NULL (required for PK)
        await sql`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM public.wallets WHERE network_id IS NULL) THEN
            RAISE EXCEPTION 'Cannot add composite PK: wallets.network_id has NULLs';
          END IF;
        END $$;
      `.execute(db)

        await sql`
        ALTER TABLE public.wallets
          ALTER COLUMN network_id SET NOT NULL
      `.execute(db)

        // Drop any leftover UNIQUE index that still enforces uniqueness on party_id alone
        await sql`
            DO $$
            DECLARE r record;
            BEGIN
              FOR r IN
                SELECT indexname
                FROM pg_indexes
                WHERE schemaname='public'
                  AND tablename='wallets'
                  AND indexdef ILIKE 'CREATE UNIQUE INDEX % ON % ("party_id")%'
              LOOP
                EXECUTE format('DROP INDEX IF EXISTS %I', r.indexname);
              END LOOP;
            END $$;
      `.execute(db)

        // Add the new composite primary key
        await sql`
            DO $$
            DECLARE
              has_pk boolean;
            BEGIN
              SELECT EXISTS (
                SELECT 1
                FROM pg_constraint c
                WHERE c.conrelid = 'public.wallets'::regclass
                  AND c.contype = 'p'
                  AND pg_get_constraintdef(c.oid) ILIKE 'PRIMARY KEY (party_id, network_id)%'
              ) INTO has_pk;

              IF NOT has_pk THEN
                EXECUTE 'ALTER TABLE public.wallets
                    ADD CONSTRAINT wallets_pkey PRIMARY KEY (party_id, network_id)';
              END IF;
            END $$;
      `.execute(db)
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
        // Use DISTINCT ON to pick first row per party_id
        await sql`
            DELETE FROM public.wallets w1
            WHERE EXISTS (
              SELECT 1
              FROM public.wallets w2
              WHERE w2.party_id = w1.party_id
                AND w2.network_id < w1.network_id
            )
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
