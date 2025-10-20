#!/usr/bin/env node

// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Option, Command } from '@commander-js/extra-typings'
import { initialize } from './init.js'

import { createCLI } from '@canton-network/core-wallet-store-sql'
import { ConfigUtils } from './config/ConfigUtils.js'

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'))

const program = new Command()
    .name('wallet-gateway')
    .version(pkg.version)
    .description('Run a remotely hosted Wallet Gateway')
    .option('-c, --config <path>', 'set config path', '../test/config.json')
    .addOption(
        new Option('-f, --log-format <format>', 'set log format')
            .choices(['json', 'pretty'])
            .default('json')
    )
    .addOption(
        new Option('-s, --store-type <type>', 'set store type')
            .choices(['sqlite', 'postgres'])
            .default('sqlite')
    )
    .action((opts) => {
        // Initialize the database with the provided config
        initialize(opts)
    })

// Parse only the options (without executing commands) to get config path
program.parseOptions(process.argv)
const options = program.opts()
const config = ConfigUtils.loadConfigFile(options.config)

// Add the `db` command now, before final parse
const cli = createCLI(config.store) as Command
program.addCommand(cli.name('db'))

// Now parse normally for execution/help
program.parseAsync(process.argv)
