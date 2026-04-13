// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path'
import { getRepoRoot, info } from './lib/utils.js'
import { installDPM } from './install-dpm.js'
import { generateDamlJsBindingsFromDar } from './lib/daml-codegen.js'

const repoRoot = getRepoRoot()

const DVP_TESTING_APP_DAR = path.join(
    repoRoot,
    '.splice/daml/dars/splice-token-test-trading-app-1.0.0.dar'
)
const DVP_TESTING_APP_DEST = path.join(repoRoot, 'damljs/dvp-testing-app')

async function main() {
    await installDPM()

    console.log(info('\n=== Generating DVP Testing App bindings ===\n'))
    await generateDamlJsBindingsFromDar(
        DVP_TESTING_APP_DAR,
        DVP_TESTING_APP_DEST
    )

    console.log(
        info('\n=== All DVP Testing App bindings generated successfully ===\n')
    )
}

main()
