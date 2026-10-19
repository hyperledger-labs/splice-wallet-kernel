// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Installs DPM and fetches the localnet DARs if they are missing, so DAML codegen tasks can run in parallel.
 */

import { installDPM } from './install-dpm.js'
import { ensureLocalnetDars } from './lib/daml-codegen.js'

async function main() {
    await installDPM()
    ensureLocalnetDars()
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
