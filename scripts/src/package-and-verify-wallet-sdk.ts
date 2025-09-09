// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import os from 'os'
import { getRepoRoot, success, error } from './utils.js'

function run(cmd: string, opts: { cwd?: string } = {}) {
    console.log(`$ ${cmd}`)
    execSync(cmd, { stdio: 'inherit', ...opts })
}

async function main() {
    // Use repoRoot from utils
    const repoRoot = getRepoRoot()
    const sdkDir = path.join(repoRoot, 'sdk/wallet-sdk')

    // Build the package
    run('yarn install', { cwd: sdkDir })
    run('yarn build', { cwd: sdkDir })

    // Create a temp dir for both the test and the tgz
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wallet-sdk-test-'))
    const tgzName = 'wallet-sdk-test.tgz'
    const tgzPath = path.join(tmpDir, tgzName)

    let ran = false
    try {
        // Pack the package into the temp dir
        run(`yarn pack --filename "${tgzPath}"`, { cwd: sdkDir })

        // Test import in temp dir
        run('yarn init -y', { cwd: tmpDir })
        run(`yarn add "${tgzPath}"`, { cwd: tmpDir })

        // Write test import file
        const testFile = path.join(tmpDir, 'test-import.js')
        fs.writeFileSync(
            testFile,
            `try {\n  require('wallet-sdk');\n  console.log('Import successful.');\n} catch (e) {\n  console.error('Import failed:', e);\n  process.exit(1);\n}`
        )
        run('yarn add node@latest', { cwd: tmpDir })
        run('node test-import.js', { cwd: tmpDir })
        ran = true
        console.log(success('Package and import test completed successfully.'))
    } finally {
        // Cleanup temp dir and tgz
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true })
        } catch {
            /* empty */
        }
        try {
            fs.unlinkSync(tgzPath)
        } catch {
            /* empty */
        }
        if (!ran) console.log(error('Cleaned up temp files after failure.'))
    }
}

main().catch((err) => {
    console.error(error(err.message || err))
    process.exit(1)
})
