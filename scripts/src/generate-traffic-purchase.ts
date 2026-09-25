// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import * as path from 'path'
import { getRepoRoot } from './lib/utils.js'
import { installDPM } from './install-dpm.js'
import { generateDamlJsBindings } from './lib/daml-codegen.js'

const repoRoot = getRepoRoot()

const TRAFFIC_PURCHASE_CONFIG = {
    destDir: path.join(repoRoot, 'damljs/traffic-purchase-models'),
    packageName: 'traffic-purchase-models',
    version: '1.0.0',
}

async function main() {
    await installDPM()

    // The model data-depends on splice's published token-standard DARs; they
    // ship in the splice-node bundle that `script:fetch:localnet` downloads.
    const darsDir = path.join(repoRoot, '.localnet/dars')
    if (!existsSync(darsDir)) {
        execSync('pnpm script:fetch:localnet', {
            cwd: repoRoot,
            stdio: 'inherit',
        })
    }

    await generateDamlJsBindings(TRAFFIC_PURCHASE_CONFIG)
}

main()
