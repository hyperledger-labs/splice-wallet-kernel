// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { execSync } from 'child_process'
import * as fs from 'fs'
import os from 'os'
import * as path from 'path'
import { error, success, repoRoot } from './lib/utils.js'
import { FlatPack } from './lib/flat-pack.js'

function run(cmd: string, opts: { cwd?: string } = {}) {
    console.log(`$ ${cmd}`)
    execSync(cmd, { stdio: 'inherit', ...opts })
}

async function main() {
    const sdkDir = 'sdk/wallet-sdk'

    // Create a temp dir for both the test and the tgz
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wallet-sdk-test-'))
    const flatpacker = new FlatPack(sdkDir, tmpDir)

    // Prepare a npm-based project in the tmp dir
    try {
        flatpacker.postInit(() => {
            // Write test import file

            const destTestFile = path.join(tmpDir, 'test-import.ts')

            const sourceTestFile = path.join(
                repoRoot,
                'scripts/sdk-package-test.txt'
            )

            fs.copyFileSync(sourceTestFile, destTestFile)

            run('npm install --save-dev typescript@^5.9.3 tsx', { cwd: tmpDir })
        })
        flatpacker.pack()
        run('npm install', { cwd: tmpDir })

        console.log('Running package tests...')

        run('tsx test-import.ts', { cwd: tmpDir })
    } catch (e) {
        fs.rmSync(tmpDir, { recursive: true, force: true })
        throw e
    }

    console.log(success('Package and import test completed successfully'))
}

main().catch((err) => {
    console.error(error(err.message || err))
    process.exit(1)
})
