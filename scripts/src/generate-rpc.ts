// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'child_process'
import * as fs from 'fs'
import { Command } from '@commander-js/extra-typings'

interface RpcGeneratorConfig {
    components: { outPath: string }[]
}

const command = new Command()
    .description('Run open-rpc-generator for a config and format its output')
    .argument('<config>', 'path to an rpc-generator-config-*.json')
    .action((config) => {
        const run = (args: string[]) =>
            execFileSync('pnpm', ['exec', ...args], { stdio: 'inherit' })

        run(['open-rpc-generator', 'generate', '-c', config])

        const { components } = JSON.parse(
            fs.readFileSync(config, 'utf8')
        ) as RpcGeneratorConfig
        run(['oxfmt', ...components.map((c) => c.outPath)])
    })

command.parse(process.argv)
