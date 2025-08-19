import { StoreConfig } from 'core-wallet-store'
import { Umzug, MigrationMeta, UmzugStorage } from 'umzug'
import { connection } from './Store'
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

const migrator = (config: StoreConfig) => {
    const db = connection(config)
    return new Umzug({
        migrations: {
            glob: './src/migrations/*.ts',
            resolve: ({ name, path, context }) => {
                // Dynamic import for ESM
                return {
                    name,
                    up: async () => {
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

// Helper functions
export const runMigrations = async (config: StoreConfig) => {
    await migrator(config).up()
}

export const rollbackLast = async (config: StoreConfig) => {
    await migrator(config).down()
}
