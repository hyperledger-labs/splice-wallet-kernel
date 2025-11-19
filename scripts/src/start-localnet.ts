// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'child_process'
import path from 'path'
import { getRepoRoot, getNetworkArg, SUPPORTED_VERSIONS } from './lib/utils.js'

const args = process.argv.slice(2)
const command = args[0]

const rootDir = getRepoRoot()
const LOCALNET_DIR = path.join(rootDir, '.localnet/docker-compose/localnet')

const composeBase = [
    'docker',
    'compose',
    '--env-file',
    `${LOCALNET_DIR}/compose.env`,
    '--env-file',
    `${LOCALNET_DIR}/env/common.env`,
    '-f',
    `${LOCALNET_DIR}/compose.yaml`,
    '-f',
    `${LOCALNET_DIR}/resource-constraints.yaml`,
    '--profile',
    'sv',
    '--profile',
    'app-provider',
    '--profile',
    'app-user',
]

const network = getNetworkArg()
const spliceVersion = SUPPORTED_VERSIONS[network].splice.version

// Set IMAGE_TAG env variable to SPLICE_VERSION
const env = { ...process.env, IMAGE_TAG: spliceVersion }

if (command === 'start') {
    execFileSync(composeBase[0], [...composeBase.slice(1), 'up', '-d'], {
        stdio: 'inherit',
        env,
    })
} else if (command === 'stop') {
    execFileSync(composeBase[0], [...composeBase.slice(1), 'down', '-v'], {
        stdio: 'inherit',
        env,
    })
} else {
    console.error('Usage: start-localnet.ts <start|stop>')
    process.exit(1)
}
