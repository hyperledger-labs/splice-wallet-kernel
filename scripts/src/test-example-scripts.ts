// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs'
import path from 'path'
import { error, getRepoRoot, success } from './lib/utils.js'
import child_process from 'child_process'

const maxIoListeners = Number.parseInt(process.env.MAX_IO_LISTENERS ?? '', 10)
if (Number.isFinite(maxIoListeners) && maxIoListeners > 0) {
    process.stdout.setMaxListeners(maxIoListeners)
    process.stderr.setMaxListeners(maxIoListeners)
}

const dir = path.join(
    getRepoRoot(),
    'docs/wallet-integration-guide/examples/scripts'
)

// do not run tests from these directory names; full name match
const EXCEPTIONS_DIR_NAMES = ['stress']

// do not run these tests; exceptions can be full filename or just any length subset of its starting characters
const EXCEPTIONS_FILE_NAMES = ['_', 'utils', 'types.ts', 'upload-dars.ts']

// When SCRIPTS_FILTER is set (comma-separated substrings), only scripts whose
// relative path contains at least one of those substrings are executed.
// When unset, directories listed in MULTI_SYNC_DIR_NAMES are excluded because
// they require a separate multi-sync environment to run.
const SCRIPTS_FILTER = process.env.SCRIPTS_FILTER
    ? process.env.SCRIPTS_FILTER.split(',').map((s) => s.trim())
    : null

// Subdirectories that contain scripts requiring a multi-sync environment.
// They are skipped during a normal run and only included when SCRIPTS_FILTER
// explicitly targets them.
const MULTI_SYNC_DIR_NAMES = ['multi-sync']

function getScriptsRecursive(currentDir: string): string[] {
    return fs.readdirSync(currentDir).flatMap((f) => {
        const fullPath = path.join(currentDir, f)
        if (fs.statSync(fullPath).isDirectory()) {
            const basename = path.basename(fullPath)
            if (EXCEPTIONS_DIR_NAMES.includes(basename)) return []
            if (!SCRIPTS_FILTER && MULTI_SYNC_DIR_NAMES.includes(basename))
                return []
            return getScriptsRecursive(fullPath)
        }
        return f.endsWith('.ts') &&
            !EXCEPTIONS_FILE_NAMES.find((e) => f.startsWith(e))
            ? [path.relative(dir, fullPath)]
            : []
    })
}

//upload dars before any other script
await executeScript('utils/upload-dars.ts')

const allScripts = getScriptsRecursive(dir)
const scripts = SCRIPTS_FILTER
    ? allScripts.filter((s) => SCRIPTS_FILTER.some((f) => s.includes(f)))
    : allScripts

async function executeScript(name: string) {
    console.log(success(`\n=== Executing script: ${name} ===`))
    await cmd('yarn', ['tsx', path.join(dir, name)]).then(() => {
        console.log(success(`Script ${name} executed successfully`))
    })
    console.log(success(`=== Finished script: ${name} ===\n`))
}

async function cmd(bin: string, args: string[]): Promise<string> {
    const child = child_process.spawn(bin, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
    })

    // spawn pino-pretty, capturing its output instead of streaming directly
    const pretty = child_process.spawn('yarn', ['pino-pretty'], {
        stdio: ['pipe', 'pipe', 'pipe'],
    })

    // pipe logs: child.stdout → pino-pretty.stdin
    child.stdout.pipe(pretty.stdin)

    let logs = ''
    child.stderr.on('data', (data: Buffer) => {
        logs += data.toString()
    })
    pretty.stdout.on('data', (data: Buffer) => {
        logs += data.toString()
    })
    pretty.stderr.on('data', (data: Buffer) => {
        logs += data.toString()
    })

    // wait for child to exit, then signal pino-pretty that there's no more input
    const childCode = await new Promise<number>((resolve) => {
        child.on('close', (code) => resolve(code ?? 1))
    })
    pretty.stdin.end()

    // wait for pino-pretty to flush before reading logs
    await new Promise<void>((resolve) => {
        pretty.on('close', resolve)
    })

    if (childCode !== 0) {
        throw Object.assign(
            new Error(`Command failed: ${bin} ${args.join(' ')}`),
            { logs }
        )
    }
    return logs
}

const BATCH_SIZE = 5
const results: Array<{
    script: string
    result: PromiseSettledResult<void>
}> = []

async function runScriptsConcurrently(scripts: string[], concurrency: number) {
    const queue = [...scripts]
    async function worker() {
        while (queue.length > 0) {
            const script = queue.shift()!
            const result = await executeScript(script).then(
                () => ({
                    script,
                    result: { status: 'fulfilled', value: undefined } as const,
                }),
                (reason) => ({
                    script,
                    result: { status: 'rejected', reason } as const,
                })
            )
            results.push(result)
        }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()))
}

await runScriptsConcurrently(scripts, BATCH_SIZE)

const failedScripts = results.flatMap(({ script, result }) =>
    result.status === 'rejected' ? [{ script, result } as const] : []
)

if (failedScripts.length > 0) {
    for (const { script, result } of failedScripts) {
        const logs = (result.reason as { logs?: string }).logs ?? ''
        if (logs) process.stdout.write(logs)
        console.log(error(`=== Failed running script: ${script} ===\n`))
    }
    process.exit(1)
}
