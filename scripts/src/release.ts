// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
// Generate a release for all packages. Performs a version bump and opens a PR against `main`

import { spawn } from 'child_process'
import { program } from '@commander-js/extra-typings'
import { confirm } from '@inquirer/prompts'
import { select } from 'inquirer-select-pro'

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

const options = ['wallet-sdk', 'dapp-sdk', 'wallet-gateway']

program
    .option('--dry-run', 'Perform a dry run (default: true)')
    .option('--no-dry-run', 'Perform a real release')
    .action(async ({ dryRun = true }) => {
        const groups = await select({
            canToggleAll: true,
            message: 'Select groups to release',
            options: options.map((opt) => ({ name: opt, value: opt })),
        }).catch(() => process.exit(0))

        if (groups.length === 0) {
            console.log('No release groups selected; quitting.')
            process.exit(0)
        }

        await runRelease(dryRun, groups)
        process.exit(0)
    })
    .parseAsync(process.argv)

async function runRelease(dryRun: boolean, groups: string[]): Promise<void> {
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

    releaseCmd += ` --groups='${groups.concat('core').join(',')}'`

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
