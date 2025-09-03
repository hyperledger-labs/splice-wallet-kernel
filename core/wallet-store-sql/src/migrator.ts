// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { Umzug, MigrationMeta, UmzugStorage } from 'umzug'
import { Kysely } from 'kysely'
import { DB } from './schema'

class KyselyStorage implements UmzugStorage {
    constructor(private db: Kysely<DB>) {}

    private async ensureTable() {
        await this.db.schema
            .createTable('migrations')
            .ifNotExists()
            .addColumn('name', 'text', (col) => col.primaryKey())
            .addColumn('executedAt', 'text', (col) => col.notNull())
            .execute()
    }

    async executed(): Promise<string[]> {
        await this.ensureTable()
        const rows = await this.db
            .selectFrom('migrations')
            .select('name')
            .execute()
        return rows.map((r) => r.name)
    }

    async logMigration({ name }: MigrationMeta): Promise<void> {
        await this.ensureTable()
        await this.db
            .insertInto('migrations')
            .values({ name, executedAt: new Date().toISOString() })
            .execute()
    }

    async unlogMigration({ name }: MigrationMeta): Promise<void> {
        await this.ensureTable()
        await this.db
            .deleteFrom('migrations')
            .where('name', '=', name)
            .execute()
    }
}

export const migrator = (db: Kysely<DB>) => {
    const ext = import.meta.url.endsWith('.ts') ? 'ts' : 'js'
    const glob = new URL(`./migrations/*.${ext}`, import.meta.url).pathname
    return new Umzug({
        migrations: {
            glob: glob,
            resolve: ({ name, path, context }) => {
                // Dynamic import for ESM
                return {
                    name,
                    up: async () => {
                        console.log(path)
                        const { up } = await import(path!)
                        return up(context)
                    },
                    down: async () => {
                        const { down } = await import(path!)
                        return down(context)
                    },
                }
            },
        },
        context: db,
        storage: new KyselyStorage(db),
        logger: console,
    })
}
