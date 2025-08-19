import { Command } from 'commander'
import { connection, StoreSql } from './store-sql.js'
import { migrator } from './migrator.js'
import type { StoreConfig } from 'core-wallet-store'
import { pino } from 'pino'

const logger = pino({ name: 'main', level: 'debug' })

export function createCLI(config: StoreConfig): Command {
    console.log('Wallet Store Sql CLI')

    const program = new Command()

    program
        .command('up')
        .description('Run all pending migrations')
        .action(async () => {
            const db = connection(config)
            const umzug = migrator(db)
            await umzug.up()
            await db.destroy()
        })

    program
        .command('down')
        .description('Rollback last migration')
        .action(async () => {
            const db = connection(config)
            const umzug = migrator(db)
            await umzug.down()
            await db.destroy()
        })

    program
        .command('status')
        .description('Show executed and pending migrations')
        .action(async () => {
            const db = connection(config)
            const umzug = migrator(db)
            const executed = await umzug.executed()
            const pending = await umzug.pending()

            console.log('Executed migrations:', executed)
            console.log('Pending migrations:', pending)

            await db.destroy()
        })

    program
        .command('reset')
        .description('Rollback all migrations and reapply them')
        .action(async () => {
            const db = connection(config)
            const umzug = migrator(db)
            const executed = await umzug.executed()

            // Rollback all executed migrations in reverse order
            for (const migration of executed.reverse()) {
                await umzug.down({ to: migration.name })
            }

            // Reapply all migrations
            await umzug.up()
            await db.destroy()
        })

    program
        .command('bootstrap')
        .description('Bootstrap DB from config')
        .action(async () => {
            const db = connection(config)
            const store = new StoreSql(db, logger)
            await Promise.all(
                config.networks.map((network) => store.addNetwork(network))
            )
            await db.destroy()
        })

    return program
}
