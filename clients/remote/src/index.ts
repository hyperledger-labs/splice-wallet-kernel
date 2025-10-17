#!/usr/bin/env node

// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Option, Command } from '@commander-js/extra-typings'
import { initialize } from './init.js'

const program = new Command()
    .name('clients-remote')
    .description('Run a remotely hosted Wallet Gateway')
    .option('-c, --config <path>', 'set config path', '../test/config.json')
    .addOption(
        new Option('-f, --log-format <format>', 'set log format')
            .choices(['json', 'pretty'])
            .default('pretty')
    )
    .addOption(
        new Option('-s, --store-type <type>', 'set store type')
            .choices(['sqlite', 'postgres'])
            .default('sqlite')
    )

program.parse()
const options = program.opts()

initialize(options)
