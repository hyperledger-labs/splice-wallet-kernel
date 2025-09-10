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

    // write Yarn config for isolated, node_modules-based test project
    fs.writeFileSync(
        path.join(tmpDir, '.yarnrc.yml'),
        ['nodeLinker: node-modules', 'enableGlobalCache: false'].join('\n') +
            '\n'
    )

    const tgzName = 'wallet-sdk-test.tgz'
    const tgzPath = path.join(tmpDir, tgzName)

    const tokenStandardDir = path.join(repoRoot, 'core/token-standard')
    const tokenStandardTgzPath = path.join(tmpDir, 'token-standard.tgz')

    // Build the package
    run('yarn install', { cwd: tokenStandardDir })
    run('yarn build', { cwd: tokenStandardDir })

    let ran = false
    try {
        // Pack the packages into the temp dir
        run(`yarn pack --filename "${tokenStandardTgzPath}"`, {
            cwd: tokenStandardDir,
        })
        run(`yarn pack --filename "${tgzPath}"`, { cwd: sdkDir })

        // Test import in temp dir
        run('yarn init -y', { cwd: tmpDir })

        // Resolve token-standard to the packed tgz
        const pkgJsonPath = path.join(tmpDir, 'package.json')
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
        pkgJson.resolutions = {
            '@canton-network/core-token-standard': `file:${tokenStandardTgzPath}`,
        }
        fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2))

        run('yarn install', { cwd: tmpDir })

        run(`yarn add "${tokenStandardTgzPath}"`, { cwd: tmpDir })
        run(`yarn add "${tgzPath}"`, { cwd: tmpDir })

        // Write test import file
        const testFile = path.join(tmpDir, 'test-import.ts')
        fs.writeFileSync(
            testFile,
            `import { WalletSDKImpl } from '@canton-network/wallet-sdk';\n  console.log('Import successful.' + WalletSDKImpl);`
        )
        run('yarn add typescript tsx', { cwd: tmpDir })
        run('tsx test-import.ts', { cwd: tmpDir })
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
