// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs'
import path from 'path'
import { error, getRepoRoot, success } from './utils.js'
import child_process from 'child_process'

const dir = path.join(
    getRepoRoot(),
    'docs/wallet-integration-guide/examples/scripts'
)

// do not run these tests; exceptions can be full filename or just any length subset of its starting characters
const exceptions = ['01-auth.ts']

const scripts = fs
    .readdirSync(dir, { recursive: true })
    .filter((f) => f.endsWith('.ts'))
    .filter((f) => !exceptions.find((e) => f.startsWith(e)))

async function executeScript(name: string) {
    console.log(success(`\n=== Executing script: ${name} ===`))
    await cmd(`yarn tsx ${path.join(dir, name)}`).then(() => {
        console.log(success(`Script ${name} executed successfully`))
    })
    console.log(success(`=== Finished script: ${name} ===\n`))
}

async function cmd(command: string): Promise<void> {
    const [bin, ...args] = command.split(' ')
    const child = child_process.spawn(bin, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
    })

    // spawn pino-pretty
    const pretty = child_process.spawn('yarn', ['pino-pretty'], {
        stdio: ['pipe', process.stdout, process.stderr],
        shell: true,
    })

    // pipe logs: child.stdout → pino-pretty.stdin
    child.stdout.pipe(pretty.stdin)

    // also forward stderr directly
    child.stderr.pipe(process.stderr)

    await new Promise<void>((resolve, reject) => {
        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Command failed: ${command}`))
            } else {
                resolve()
            }
        })
    })
}

// this is sequential, we can parallelize if needed
for (const script of scripts) {
    try {
        await executeScript(script)
    } catch {
        console.log(error(`=== Failed running script: ${script} ===\n`))
        process.exit(1)
    }
}
