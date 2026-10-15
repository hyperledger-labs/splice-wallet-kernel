// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Command } from 'commander'
import { connection } from './store-sql.js'
import { migrator } from './migrator.js'
import { bootstrap } from './bootstrap.js'
import type { StoreConfig } from './schema.js'
import { getLogger } from '@logtape/logtape'

const logger = getLogger(['core', 'signing-store-sql', 'cli'])

export function createCLI(config: StoreConfig): Command {
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

            logger.info('Executed migrations: {executed}', { executed })
            logger.info('Pending migrations: {pending}', { pending })

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
            await bootstrap(db)
            await db.destroy()
        })

    return program
}
