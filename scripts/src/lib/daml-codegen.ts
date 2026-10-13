// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path'
import * as fs from 'fs'
import { execSync } from 'child_process'
import { info, error, getRepoRoot } from './utils.js'

/**
 * Returns the directory containing the DARs shipped with localnet, fetching localnet if needed.
 */
export function ensureLocalnetDars(): string {
    const repoRoot = getRepoRoot()
    const darsDir = path.join(repoRoot, '.localnet/dars')

    if (!fs.existsSync(darsDir)) {
        execSync('pnpm script:fetch:localnet', {
            cwd: repoRoot,
            stdio: 'inherit',
        })
    }

    return darsDir
}

/**
 * Run dpm codegen js for one or more DAR files
 * Generates JavaScript/TypeScript bindings for the DARs and all their dependencies
 */
export function runDamlCodegen(options: {
    workingDir: string
    darFileNames: string[]
    outputDir?: string
}): void {
    const { darFileNames, workingDir, outputDir = '.' } = options

    const darPaths = darFileNames.map((darFileName) => {
        const darCandidates = [
            path.join(workingDir, darFileName),
            path.join(workingDir, '.daml', 'dist', darFileName),
        ]
        const darPath = darCandidates.find((candidate) =>
            fs.existsSync(candidate)
        )

        if (!darPath) {
            throw new Error(
                `DAR file not found. Checked: ${darCandidates.join(', ')}`
            )
        }

        return path.relative(workingDir, darPath)
    })

    console.log(info('Running "dpm codegen-js"...'))
    try {
        execSync(
            `dpm codegen-js ${darPaths.map((p) => `"${p}"`).join(' ')} -o "${outputDir}"`,
            {
                cwd: workingDir,
                stdio: 'inherit',
            }
        )
        console.log(info('Codegen completed.'))
    } catch (err) {
        console.error(error(`Error running dpm codegen js: ${err}`))
        throw err
    }
}
