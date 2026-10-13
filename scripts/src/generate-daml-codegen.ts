// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path'
import { getArgValue, getRepoRoot, info, warn } from './lib/utils.js'
import { installDPM } from './install-dpm.js'
import { ensureLocalnetDars, runDamlCodegen } from './lib/daml-codegen.js'
import { existsSync } from 'fs'

const defaultDarFiles = [
    'splice-test-token-v1-1.0.0',
    'splice-token-test-trading-app-1.0.0',
    'splice-test-token-v2-1.0.0',
]

const codegenOutputDir = (darFile: string) =>
    darFile.replace(/-\d*\.\d*\.\d*$/, '')

const repoRoot = getRepoRoot()

/**
 * Installs DPM, ensures localnet DAR artifacts exist, and runs DAML codegen
 * for configured DAR packages.
 *
 * @param --dar-files Optional JSON array of additional DAR file names (without .dar extension) to process.
 *                    Example: `--dar-files='["file-1.0.0","file-2.0.0"]'`
 */
async function main() {
    const isCi = process.env.CI === 'true'
    const forceCodegen = process.env.FORCE_TEST_TOKEN_CODEGEN === 'true'

    const customDarFiles = getArgValue('dar-files')

    const darFileNames = [
        ...(customDarFiles ? JSON.parse(customDarFiles) : []),
        ...defaultDarFiles,
    ] as string[]

    const darDir = (file: string) => path.join('damljs', codegenOutputDir(file))

    if (
        isCi &&
        !forceCodegen &&
        darFileNames.every((file) => existsSync(darDir(file)))
    ) {
        console.log(
            info(
                `CI detected and generated codegen artifacts already exist. Skipping DPM install and codegen.`
            )
        )
        console.log(
            info(
                'Set FORCE_TEST_TOKEN_CODEGEN=true to force regeneration in CI.'
            )
        )
        return
    }

    if (isCi && !forceCodegen) {
        console.log(
            warn(
                `CI detected but codegen is missing; proceeding with DPM install and codegen.`
            )
        )
    }

    await installDPM()

    const darsDir = ensureLocalnetDars()

    await Promise.all(
        darFileNames.map(async (file) => {
            const options = {
                workingDir: darsDir,
                darFileNames: [`${file}.dar`],
                outputDir: path.join(repoRoot, darDir(file)),
            }
            console.info(
                'Producing codegen with following properties:',
                options
            )
            return await runDamlCodegen(options)
        })
    )
}

main()
