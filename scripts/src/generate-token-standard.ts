// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Generates JS bindings for the released token standard DARs. Each upstream Daml package is kept
 * as its own codegen package, so package names and IDs match what is deployed on ledger.
 */

import * as fs from 'fs'
import * as path from 'path'
import { getRepoRoot } from './lib/utils.js'
import { installDPM } from './install-dpm.js'
import { ensureLocalnetDars, runDamlCodegen } from './lib/daml-codegen.js'

const repoRoot = getRepoRoot()

interface TokenStandardCodegenConfig {
    outputDir: string
    darFileNames: string[]
}

const TOKEN_STANDARD_CONFIG_V1: TokenStandardCodegenConfig = {
    outputDir: path.join(repoRoot, 'damljs/token-standard-models'),
    darFileNames: [
        'splice-api-token-metadata-v1-1.0.0.dar',
        'splice-api-token-holding-v1-1.0.0.dar',
        'splice-api-token-allocation-v1-1.0.0.dar',
        'splice-api-token-allocation-instruction-v1-1.0.0.dar',
        'splice-api-token-allocation-request-v1-1.0.0.dar',
        'splice-api-token-transfer-instruction-v1-1.0.0.dar',
    ],
}

const TOKEN_STANDARD_CONFIG_V2: TokenStandardCodegenConfig = {
    outputDir: path.join(repoRoot, 'damljs/token-standard-models-v2'),
    darFileNames: [
        'splice-api-token-metadata-v1-1.0.0.dar',
        'splice-api-token-holding-v2-1.0.0.dar',
        'splice-api-token-allocation-v2-1.0.0.dar',
        'splice-api-token-allocation-instruction-v2-1.0.0.dar',
        'splice-api-token-allocation-request-v2-1.0.0.dar',
        'splice-api-token-transfer-events-v2-1.0.0.dar',
        'splice-api-token-transfer-instruction-v2-1.0.0.dar',
    ],
}

async function main(configs: TokenStandardCodegenConfig[]) {
    await installDPM()

    const darsDir = ensureLocalnetDars()

    for (const { outputDir, darFileNames } of configs) {
        // Fully generated, clear it so no stale packages are left behind
        fs.rmSync(outputDir, { recursive: true, force: true })
        runDamlCodegen({ workingDir: darsDir, darFileNames, outputDir })
    }
}

main([TOKEN_STANDARD_CONFIG_V1, TOKEN_STANDARD_CONFIG_V2]).catch((err) => {
    console.error(err)
    process.exit(1)
})
