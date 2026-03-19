// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Kysely } from 'kysely'
import { DB } from '../schema.js'

export async function up(db: Kysely<DB>): Promise<void> {
    console.log('Creating normalized rights tables')

    await db.schema
        .createTable('user_party_rights')
        .ifNotExists()
        .addColumn('user_id', 'text', (col) => col.notNull())
        .addColumn('network_id', 'text', (col) => col.notNull())
        .addColumn('party_id', 'text', (col) => col.notNull())
        .addColumn('right', 'text', (col) => col.notNull())
        .addPrimaryKeyConstraint('user_party_rights_pk', [
            'user_id',
            'network_id',
            'party_id',
            'right',
        ])
        .addForeignKeyConstraint(
            'user_party_rights_wallet_fk',
            ['party_id', 'network_id', 'user_id'],
            'wallets',
            ['party_id', 'network_id', 'user_id'],
            (cb) => cb.onDelete('cascade')
        )
        .execute()

    await db.schema
        .createTable('user_rights')
        .ifNotExists()
        .addColumn('user_id', 'text', (col) => col.notNull())
        .addColumn('network_id', 'text', (col) => col.notNull())
        .addColumn('right', 'text', (col) => col.notNull())
        .addPrimaryKeyConstraint('user_rights_pk', [
            'user_id',
            'network_id',
            'right',
        ])
        .addForeignKeyConstraint(
            'user_rights_network_fk',
            ['network_id'],
            'networks',
            ['id'],
            (cb) => cb.onDelete('cascade')
        )
        .execute()
}

export async function down(db: Kysely<DB>): Promise<void> {
    console.log('Dropping normalized rights tables')

    await db.schema.dropTable('user_rights').ifExists().execute()
    await db.schema.dropTable('user_party_rights').ifExists().execute()
}
