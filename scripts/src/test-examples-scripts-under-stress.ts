// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/*
  Orchestrator for running regular example scripts under background stress load.

  This script starts a background stress process (background-stress-load.ts) that continuously
  generates load on the ledger, then runs all regular test scripts sequentially to verify
  they handle heavy load gracefully. If any test script fails, the stress test fails.

  Usage with GitHub CLI:
    gh workflow run "Examples Under Stress" \
      --ref=your-branch-name \
      -f ref=your-branch-name \
      -f network=devnet \
      -f parties_per_interval=3 \
      -f interval_length_ms=5000 \
      -f transfers_per_party=5 \
      -f stress_log_level=silent

  Environment variables:
    - PARTIES_PER_INTERVAL: Number of parties created per interval (default: 3)
    - INTERVAL_LENGTH_MS: Interval length in milliseconds (default: 5000)
    - TRANSFERS_PER_PARTY: Number of transfers per party (default: 5)
    - BACKGROUND_STRESS_LOG_LEVEL: Log level for background stress (default: 'silent')
    - WARMUP_MS: Warmup time for background stress before starting example scripts (default: 8000)
*/

import fs from 'fs'
import path from 'path'
import { error, getRepoRoot, success } from './lib/utils.js'
import child_process from 'child_process'

const dir = path.join(
    getRepoRoot(),
    'docs/wallet-integration-guide/examples/scripts'
)

// configure background stress runner
const STRESS_BG_FILE = 'stress/background-stress-load.ts'
const WARMUP_MS = parseInt(process.env.WARMUP_MS ?? '8000', 10)
const STOP_GRACE_MS = 6000 // Timeout for graceful shutdown of background stress script before SIGKILL
const BACKGROUND_STRESS_LOG_LEVEL =
    process.env.BACKGROUND_STRESS_LOG_LEVEL ?? 'silent'
const PARTIES_PER_INTERVAL = process.env.PARTIES_PER_INTERVAL ?? 'default'
const INTERVAL_LENGTH_MS = process.env.INTERVAL_LENGTH_MS ?? 'default'
const TRANSFERS_PER_PARTY = process.env.TRANSFERS_PER_PARTY ?? 'default'

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

function startBackgroundStress(): child_process.ChildProcess {
    const target = path.join(dir, STRESS_BG_FILE)
    if (!fs.existsSync(target)) {
        throw new Error(`Background stress script not found: ${target}`)
    }

    // Log configuration (values will use defaults from background stress script if not set)
    console.log(
        success(
            `Starting background stress: ${STRESS_BG_FILE} with configuration:
PARTIES_PER_INTERVAL: ${PARTIES_PER_INTERVAL}
INTERVAL_LENGTH_MS: ${INTERVAL_LENGTH_MS}
TRANSFERS_PER_PARTY: ${TRANSFERS_PER_PARTY}
BACKGROUND_STRESS_LOG_LEVEL: ${BACKGROUND_STRESS_LOG_LEVEL}`
        )
    )

    const child = child_process.spawn('yarn', ['tsx', target], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        env: {
            ...process.env,
            BACKGROUND_STRESS_LOG_LEVEL,
        },
    })

    let ready = false
    const onData = (buf: Buffer) => {
        const s = buf.toString()
        if (s.includes('[stress] ready') || s.includes('starting stress run')) {
            child.stdout?.off('data', onData)
            ready = true
        }
    }
    child.stdout?.on('data', onData)

    // show only errors from stress
    child.stderr.pipe(process.stderr)

    const start = Date.now()
    while (Date.now() - start < WARMUP_MS && !ready) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50) // tiny sleep without reformatting structure
    }

    console.log(success(`Background stress warmed up (<= ${WARMUP_MS}ms).`))
    return child
}

async function stopBackgroundStress(
    child: child_process.ChildProcess
): Promise<void> {
    return new Promise<void>((resolve) => {
        if (!child || child.killed) return resolve()
        try {
            process.kill(child.pid!, 'SIGINT') // allow cleanup in the stress script
        } catch {
            /* ignore */
        }

        const t = setTimeout(() => {
            try {
                child.kill('SIGKILL')
            } catch {
                /* ignore */
            }
            resolve()
        }, STOP_GRACE_MS)

        child.on('exit', () => {
            clearTimeout(t)
            resolve()
        })
    })
}

// this is sequential, we can parallelize if needed
const stressProc = startBackgroundStress()

let failed = false
for (const script of scripts) {
    try {
        await executeScript(script)
    } catch {
        console.log(error(`=== Failed running script: ${script} ===\n`))
        failed = true
        break
    }
}

await stopBackgroundStress(stressProc)

if (failed) {
    process.exit(1)
} else {
    console.log(
        success('All scripts passed while background stress was running.')
    )
}
