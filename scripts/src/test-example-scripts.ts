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

// run these tests sequentially; entries can be full filenames or any length prefix of the starting characters
const SEQUENTIAL_FILE_NAMES = [
    //this is here because createRenewTransferPreapproval uses UTXOS from the validatorOperatorParty
    '14-token-standard',
]
// do not run tests from these directory names; full name match
const EXCEPTIONS_DIR_NAMES = ['stress']

// do not run these tests; exceptions can be full filename or just any length subset of its starting characters
const EXCEPTIONS_FILE_NAMES = [
    '01-auth.ts',
    '13-auth-tls.ts',
    '05-',
    '01-one-step',
    '02-one-step',
]

function getScriptsRecursive(currentDir: string): string[] {
    return fs.readdirSync(currentDir).flatMap((f) => {
        const fullPath = path.join(currentDir, f)
        if (fs.statSync(fullPath).isDirectory()) {
            if (EXCEPTIONS_DIR_NAMES.includes(path.basename(fullPath)))
                return []
            return getScriptsRecursive(fullPath)
        }
        return f.endsWith('.ts') &&
            !EXCEPTIONS_FILE_NAMES.find((e) => f.startsWith(e))
            ? [path.relative(dir, fullPath)]
            : []
    })
}

const scripts = getScriptsRecursive(dir)

function shouldRunSequentially(script: string): boolean {
    return Boolean(
        SEQUENTIAL_FILE_NAMES.find((prefix) => script.startsWith(prefix))
    )
}

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

const BATCH_SIZE = 25
const results: Array<{
    script: string
    result: PromiseSettledResult<void>
}> = []
const parallelBatch: string[] = []

async function flushParallelBatch(): Promise<void> {
    if (parallelBatch.length === 0) return

    const batch = parallelBatch.splice(0, parallelBatch.length)
    const batchResults = await Promise.allSettled(
        batch.map((script) => executeScript(script))
    )

    results.push(
        ...batch.map((script, index) => ({
            script,
            result: batchResults[index],
        }))
    )
}

if (SEQUENTIAL_FILE_NAMES.length > 0) {
    console.log(
        success(
            `Running matching scripts sequentially for prefixes: ${SEQUENTIAL_FILE_NAMES.join(', ')}`
        )
    )
}

for (const script of scripts) {
    if (shouldRunSequentially(script)) {
        await flushParallelBatch()
        const [result] = await Promise.allSettled([executeScript(script)])
        results.push({ script, result })
        continue
    }

    parallelBatch.push(script)
    if (parallelBatch.length >= BATCH_SIZE) {
        await flushParallelBatch()
    }
}

await flushParallelBatch()

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
