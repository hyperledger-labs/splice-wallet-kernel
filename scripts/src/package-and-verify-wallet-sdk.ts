// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { execSync } from 'child_process'
import 'colors'
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
    const flatpacker = new FlatPack(sdkDir, 'yarn', tmpDir)

    // Prepare a yarn-based project in the tmp dir
    try {
        flatpacker.postInit(() => {
            // write Yarn config for isolated, node_modules-based test project
            fs.writeFileSync(
                path.join(tmpDir, '.yarnrc.yml'),
                ['nodeLinker: node-modules', 'enableGlobalCache: false'].join(
                    '\n'
                ) + '\n'
            )

            // Write test import file

            const destTestFile = path.join(tmpDir, 'test-import.ts')

            const sourceTestFile = path.join(
                repoRoot,
                'scripts/sdk-package-test.txt'
            )

            fs.copyFileSync(sourceTestFile, destTestFile)

            run('yarn add typescript tsx', { cwd: tmpDir })
        })
        flatpacker.pack()
        run('yarn install --no-immutable', { cwd: tmpDir })

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
