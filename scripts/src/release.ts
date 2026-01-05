// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
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

// Helper to execute command and capture output
async function cmdOutput(command: string): Promise<string> {
    const [bin, ...args] = command.split(' ')
    return new Promise((resolve, reject) => {
        const child = spawn(bin, args, { shell: true })
        let output = ''

        child.stdout?.on('data', (data) => {
            output += data.toString()
        })

        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Command failed: ${command}`))
            } else {
                resolve(output.trim())
            }
        })
    })
}

const options = ['wallet-sdk', 'dapp-sdk', 'wallet-gateway']

program
    .option('--dry-run', 'Perform a dry run (default: true)')
    .option('--no-dry-run', 'Perform a real release')
    .option(
        '--backport',
        'Backport release mode (skip main checkout, use current branch)'
    )
    .action(async ({ dryRun = true, backport = false }) => {
        const groups = await select({
            canToggleAll: true,
            message: 'Select groups to release',
            options: options.map((opt) => ({ name: opt, value: opt })),
        }).catch(() => process.exit(0))

        if (groups.length === 0) {
            console.log('No release groups selected; quitting.')
            process.exit(0)
        }

        await runRelease(dryRun, groups, backport)
        process.exit(0)
    })
    .parseAsync(process.argv)

async function runRelease(
    dryRun: boolean,
    groups: string[],
    backport: boolean
): Promise<void> {
    let baseBranch: string

    if (backport) {
        // For backport releases, stay on current branch
        baseBranch = await cmdOutput('git rev-parse --abbrev-ref HEAD')
        console.log(`Backport mode: Using current branch '${baseBranch}'`)

        // Ensure we're on a backport branch
        if (!baseBranch.startsWith('backport/')) {
            const proceed = await confirm({
                message: `Current branch '${baseBranch}' doesn't look like a backport branch (should start with 'backport/'). Continue anyway?`,
                default: false,
            })

            if (!proceed) {
                console.log('Aborting')
                process.exit(0)
            }
        }
    } else {
        // For main releases, checkout main and pull
        baseBranch = 'main'
        await cmd('git checkout main')
        await cmd('git pull')
    }
    await cmd('git fetch --tags --force')

    const timestamp = Date.now().toString().slice(0, -3) // Unix timestamp in seconds
    const branchName = `release/${timestamp}`

    await cmd(`git checkout -b ${branchName}`)
    await cmd(`git push --set-upstream origin ${branchName}`)

    try {
        await cmd('gh auth status')
    } catch (error) {
        console.error(
            `\ngh CLI is not authenticated. Please run "gh auth login" and try again. ${error}`
        )
        process.exit(1)
    }

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
