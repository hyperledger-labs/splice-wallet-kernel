// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path'
import { getRepoRoot } from './lib/utils.js'
import { installDPM } from './install-dpm.js'
import {
    ensureLocalnetDars,
    runDamlBuild,
    runDamlCodegen,
} from './lib/daml-codegen.js'

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
    ensureLocalnetDars()

    // The model data-depends on the credit package's DAR, so build it first.
    runDamlBuild(path.join(repoRoot, 'damljs/canton-traffic-credit'))

    const { destDir, packageName, version } = TRAFFIC_PURCHASE_CONFIG

    runDamlBuild(destDir)
    runDamlCodegen({
        workingDir: destDir,
        darFileNames: [`${packageName}-${version}.dar`],
    })
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
