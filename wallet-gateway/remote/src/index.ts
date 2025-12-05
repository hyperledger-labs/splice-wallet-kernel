#!/usr/bin/env node

// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Option, Command } from '@commander-js/extra-typings'
import { initialize } from './init.js'

import { createCLI } from '@canton-network/core-wallet-store-sql'
import { ConfigUtils } from './config/ConfigUtils.js'

import pino from 'pino'
import z from 'zod'
import { configSchema } from './config/Config.js'
import exampleConfig from './example-config.js'
import { GATEWAY_VERSION } from './version.js'

const program = new Command()
    .name('wallet-gateway')
    .version(GATEWAY_VERSION)
    .description('Run a remotely hosted Wallet Gateway')
    .option('-c, --config <path>', 'set config path', './config.json')
    .option('--config-schema', 'output the config schema and exit', false)
    .option('--config-example', 'output an example config and exit', false)
    .option('-p, --port [port]', 'set port (overrides config)')
    .addOption(
        new Option('-f, --log-format <format>', 'set log format')
            .choices(['json', 'pretty'])
            .default('pretty')
    )
    .action((opts) => {
        if (opts.configSchema) {
            console.log(JSON.stringify(z.toJSONSchema(configSchema), null, 2))
            process.exit(0)
        }

        if (opts.configExample) {
            console.log(JSON.stringify(exampleConfig, null, 2))
            process.exit(0)
        }

        // Define project-global logger
        const logger = pino({
            name: 'main',
            level: 'debug',
            ...(opts.logFormat === 'pretty'
                ? {
                      transport: {
                          target: 'pino-pretty',
                      },
                  }
                : {}),
        })
        // Initialize the database with the provided config
        initialize(opts, logger)
    })

// Parse only the options (without executing commands) to get config path
program.parseOptions(process.argv)
const options = program.opts()

export type CliOptions = typeof options

// Add a documented stub
let db = new Command('db')
    .description('Database management commands')
    .allowUnknownOption(true)

const hasDb = process.argv.slice(2).includes('db')

if (hasDb) {
    const config = ConfigUtils.loadConfigFile(options.config)
    db = createCLI(config.store) as Command
}

program.addCommand(db.name('db'))

// Now parse normally for execution/help
program.parseAsync(process.argv)
