// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path'
import { getRepoRoot } from './lib/utils.js'
import { installDPM } from './install-dpm.js'
import { generateDamlJsBindings } from './lib/daml-codegen.js'
import { fetchTrafficPurchaseDars } from './fetch-traffic-purchase-dars.js'

const repoRoot = getRepoRoot()

const TRAFFIC_PURCHASE_CONFIG = {
    destDir: path.join(repoRoot, 'damljs/traffic-purchase-models'),
    packageName: 'traffic-purchase-models',
    version: '1.0.0',
}

async function main() {
    await installDPM()
    await fetchTrafficPurchaseDars()
    await generateDamlJsBindings(TRAFFIC_PURCHASE_CONFIG)
}

main()
