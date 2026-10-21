// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path'
import { getRepoRoot } from './lib/utils.js'
import { installDPM } from './install-dpm.js'
import { runDamlBuild, runDamlCodegen } from './lib/daml-codegen.js'

const repoRoot = getRepoRoot()

const CANTON_TRAFFIC_CREDIT_CONFIG = {
    destDir: path.join(repoRoot, 'damljs/canton-traffic-credit'),
    packageName: 'canton-traffic-credit',
    version: '1.0.0',
}

async function main() {
    await installDPM()

    const { destDir, packageName, version } = CANTON_TRAFFIC_CREDIT_CONFIG

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
