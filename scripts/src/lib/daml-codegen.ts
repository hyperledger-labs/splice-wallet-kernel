// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path'
import * as fs from 'fs'
import { execSync } from 'child_process'
import { info, warn, error, getRepoRoot } from './utils.js'

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
 * Run `dpm build` in the specified directory.
 *
 * Needed for Daml packages whose sources live in this repo (as opposed to the
 * pre-built DARs shipped with localnet), so a DAR exists before codegen runs.
 * If the required SDK is missing, it is installed and the build is retried.
 */
export function runDamlBuild(workingDir: string): void {
    const damlYamlPath = path.join(workingDir, 'daml.yaml')
    if (!fs.existsSync(damlYamlPath)) {
        throw new Error(`Missing daml.yaml in Daml project: ${damlYamlPath}`)
    }

    console.log(info(`Running "dpm build" in ${workingDir}...`))
    try {
        const output = execSync('dpm build', {
            cwd: workingDir,
            encoding: 'utf-8',
        })
        console.log(output)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        const stdout = err.stdout?.toString() || ''
        const stderr = err.stderr?.toString() || ''
        const combinedOutput = stdout + stderr

        if (stdout) console.log(stdout)
        if (stderr) console.error(stderr)

        // `dpm` reports a missing SDK as SDK_NOT_INSTALLED and tells us which
        // version to install; recover from that automatically.
        const installMatch = combinedOutput.includes('SDK_NOT_INSTALLED')
            ? combinedOutput.match(/via\s+'dpm install ([^']+)'/)
            : null

        if (!installMatch?.[1]) {
            throw err
        }

        const version = installMatch[1]
        console.log(warn(`SDK not installed, installing version ${version}...`))
        try {
            execSync(`dpm install ${version}`, {
                cwd: workingDir,
                stdio: 'inherit',
            })
            console.log(info('SDK installed, retrying build...'))
            execSync('dpm build', { cwd: workingDir, stdio: 'inherit' })
        } catch (installErr) {
            console.error(
                error(`Failed to install SDK or retry build: ${installErr}`)
            )
            throw installErr
        }
    }
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
        console.error(error(`Error running dpm codegen js: ${String(err)}`))
        throw err
    }
}
