#!/usr/bin/env ts-node

import { runMigrations } from './migrator'

const config = {
    connection: {
        type: 'sqlite' as const,
        database: './../../clients/remote/store.sqlite',
    },
    networks: [],
}

async function main() {
    await runMigrations(config)
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
