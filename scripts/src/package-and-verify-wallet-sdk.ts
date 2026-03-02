// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { execSync } from 'child_process'
import 'colors'
import { diffChars } from 'diff'
import * as fs from 'fs'
import os from 'os'
import * as path from 'path'
import { error, success, repoRoot } from './lib/utils.js'
import { FlatPack } from './lib/flat-pack.js'

function run(cmd: string, opts: { cwd?: string } = {}) {
    console.log(`$ ${cmd}`)
    execSync(cmd, { stdio: 'inherit', ...opts })
}

function runAssert(cmd: string, assertOutput: string, opts: { cwd?: string }) {
    console.log(`$ ${cmd}`)
    const output = execSync(cmd, { stdio: 'pipe', ...opts }).toString()
    const cleanOut = output.trim()
    const cleanAssert = assertOutput.trim()

    if (cleanOut !== cleanAssert) {
        const diff = diffChars(cleanOut, cleanAssert)

        diff.forEach((part) => {
            // green for additions, red for deletions
            const text = part.added
                ? part.value.bgGreen
                : part.removed
                  ? part.value.bgRed
                  : part.value
            process.stdout.write(text)
        })
        console.log('\n')
        throw new Error('Output did not match expected, see above diff')
    }
    return output
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
            const testFile = path.join(tmpDir, 'test-import.ts')
            fs.writeFileSync(
                testFile,
                `import { WalletSDKImpl } from '@canton-network/wallet-sdk';\n  console.log('Import successful.' + WalletSDKImpl);`
            )

            run('yarn add typescript tsx', { cwd: tmpDir })
        })
        flatpacker.pack()
        run('yarn install --no-immutable', { cwd: tmpDir })
    } catch (e) {
        fs.rmSync(tmpDir, { recursive: true, force: true })
        throw e
    }

    let ran = false
    const expectedOutputTxt = path.join(
        repoRoot,
        'scripts/expected-install-output.txt'
    )
    const expectedOutput = fs.readFileSync(expectedOutputTxt, 'utf8')

    try {
        //we check the index have not changed by comparing it to last run.
        //if they do not match then the expected output is added to the file so a second run will pass.
        runAssert('tsx test-import.ts', expectedOutput, {
            cwd: tmpDir,
        })
        ran = true
        console.log(success('Package and import test completed successfully.'))
    } catch {
        console.log(error('final script should looks like:'))
        console.log(expectedOutputTxt)
        const output = runAssert('tsx test-import.ts', '', { cwd: tmpDir })
        fs.writeFileSync(expectedOutput, output)
    } finally {
        // Cleanup temp dir and tgz
        fs.rmSync(tmpDir, { recursive: true, force: true })
        if (!ran) console.log(error('Cleaned up temp files after failure.'))
    }
}

main().catch((err) => {
    console.error(error(err.message || err))
    process.exit(1)
})
