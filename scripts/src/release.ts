// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
// Generate a release for all packages. Performs a version bump and opens a PR against `main`

import { spawn } from 'child_process'
import { program } from '@commander-js/extra-typings'
import { getAllNxDependencies } from './lib/utils.js'
import { confirm, select } from '@inquirer/prompts'

// This helper passes through the underlying command's input/output to console
async function cmd(command: string): Promise<void> {
    const [bin, ...args] = command.split(' ')
    const child = spawn(bin, args, { stdio: 'inherit', shell: true })

    await new Promise<void>((resolve, reject) => {
        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Command failed: ${command}`))
                process.exit(code)
            } else {
                resolve()
            }
        })
    })
}

const ALL_OPTION = '(all packages)'
const QUIT_OPTION = '(quit)'

program
    .option('--dry-run', 'Perform a dry run (default: true)')
    .option('--no-dry-run', 'Perform a real release')
    .action(async ({ dryRun = true }) => {
        const project = await select({
            message: 'Select project to release',
            choices: [
                'wallet-sdk',
                'dapp-sdk',
                'wallet-gateway-remote',
                ALL_OPTION,
                QUIT_OPTION,
            ],
        }).catch(() => process.exit(0))

        if (project === QUIT_OPTION) {
            console.log('Aborting')
            process.exit(0)
        }

        let deps = undefined

        if (project === ALL_OPTION) {
            console.log('Cutting a release for everything.')
        } else {
            deps = await getAllNxDependencies(`@canton-network/${project}`)
        }

        await runRelease(dryRun, deps)
        process.exit(0)
    })
    .parseAsync(process.argv)

async function runRelease(dryRun: boolean, projects?: string[]): Promise<void> {
    let releaseCmd = `yarn nx release --skip-publish`

    if (dryRun === false) {
        const proceedDryRun = await confirm({
            message:
                'Dry run is off, and this will result in real GitHub tags & releases being made. Proceed?',
            default: false,
        })

        if (!proceedDryRun) {
            console.log('Aborting')
            process.exit(0)
        }
    } else {
        releaseCmd += ' --dry-run'
    }

    if (projects && projects.length > 0) {
        console.log('Releasing the following set of packages: ', projects)
        releaseCmd += ` --projects='${projects.join(',')}'`
    }

    if (!dryRun) {
        const proceedRelease = await confirm({
            message: `About to run:\n\n${releaseCmd}\n\nProceed?`,
            default: false,
        })

        if (!proceedRelease) {
            console.log('Aborting')
            process.exit(0)
        }
    }

    await cmd(releaseCmd)
}
