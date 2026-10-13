// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs'
import path from 'path'
import {
    error,
    getRepoRoot,
    success,
    SUPPORTED_VERSIONS,
    getNetworkArg,
} from './lib/utils.js'
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

const network = getNetworkArg()

const spliceVersion =
    process.env.SPLICE_VERSION ?? SUPPORTED_VERSIONS[network].splice.version
console.log(
    success(
        `Running examples against ${network} with splice version: ${spliceVersion}`
    )
)

// do not run tests from these directory names; full name match
const EXCEPTIONS_DIR_NAMES = [
    'stress',
    '13-rewards-for-deposits',
    ...(network === 'mainnet' ? ['18-two-step-transfer-v2'] : []),
]

// do not run these tests; exceptions can be full filename or just any length subset of its starting characters
const EXCEPTIONS_FILE_NAMES = ['_', 'utils', 'types.ts', 'upload-dars.ts']

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

//upload dars before any other script
await executeScript('utils/upload-dars.ts')

const scripts = getScriptsRecursive(dir)

async function executeScript(name: string) {
    console.log(success(`\n=== Executing script: ${name} ===`))
    await cmd('pnpm', ['tsx', path.join(dir, name)]).then(() => {
        console.log(success(`Script ${name} executed successfully`))
    })
    console.log(success(`=== Finished script: ${name} ===\n`))
}

async function cmd(bin: string, args: string[]): Promise<string> {
    // 1. Force pnpm to look in node_modules/.bin using 'exec'
    const childArgs =
        bin === 'pnpm' && args[0] !== 'exec' ? ['exec', ...args] : args
    const child = child_process.spawn(bin, childArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
    })

    const pretty = child_process.spawn('pnpm', ['exec', 'pino-pretty'], {
        stdio: ['pipe', 'pipe', 'pipe'],
    })

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

    return new Promise((resolve, reject) => {
        // 3. Add a hard timeout (e.g., 2 minutes) to prevent infinite CI stalls
        const timeout = setTimeout(
            () => {
                child.kill('SIGKILL')
                pretty.kill('SIGKILL')
                reject(
                    Object.assign(
                        new Error(
                            `TIMEOUT after 10 minutes: ${bin} ${childArgs.join(' ')}`
                        ),
                        { logs }
                    )
                )
            },
            1000 * 60 * 10
        ) // 10 minutes

        // 2. Await BOTH processes concurrently. If pretty crashes, child.stdout.pipe
        // handles the broken pipe gracefully now that we aren't sequentially blocked.
        Promise.all([
            new Promise<number>((res) =>
                child.on('close', (code) => res(code ?? 1))
            ),
            new Promise<number>((res) =>
                pretty.on('close', (code) => res(code ?? 1))
            ),
        ]).then(([childCode, prettyCode]) => {
            clearTimeout(timeout)

            if (childCode !== 0) {
                reject(
                    Object.assign(
                        new Error(
                            `Command failed (code ${childCode}): ${bin} ${childArgs.join(' ')}`
                        ),
                        { logs }
                    )
                )
            } else if (prettyCode !== 0) {
                reject(
                    Object.assign(
                        new Error(
                            `Pretty failed (code ${prettyCode}): ${bin} ${childArgs.join(' ')}`
                        ),
                        { logs }
                    )
                )
            } else {
                resolve(logs)
            }
        })
    })
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
