// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Puts the CIP-112 v2 token-standard DARs that damljs/traffic-purchase-models
 * data-depends on into damljs/traffic-purchase-models/.dars/.
 *
 * They are copied out of the pinned splice-app image rather than compiled
 * from splice's sources, because the package id is what a real participant
 * checks: Canton refuses to vet two packages with the same name and version,
 * so a validator that already runs splice's own splice-api-token-metadata-v1
 * rejects a DAR built locally against the same sources (dpm's build hashes
 * differently from splice's own release build). Only the published artifacts
 * let the model be uploaded to a real network.
 *
 * SPLICE_VERSION is pinned independently of scripts/src/lib/version-config.json's
 * canton/localnet splice versions (currently 0.6.14/0.7.3): those predate the v2
 * token-standard interfaces this model needs, so this fetch targets its own,
 * newer splice release until the rest of the repo moves onto one that has v2.
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { error, ensureDir, getRepoRoot, info, warn } from './lib/utils.js'

const DEFAULT_SPLICE_VERSION = '0.8.1'

const PACKAGES = [
    'splice-api-token-metadata-v1',
    'splice-api-token-holding-v2',
    'splice-api-token-transfer-instruction-v2',
] as const

const DEST_DIR = path.join(
    getRepoRoot(),
    'damljs/traffic-purchase-models/.dars'
)

export async function fetchTrafficPurchaseDars(
    spliceVersion = process.env.SPLICE_VERSION || DEFAULT_SPLICE_VERSION
): Promise<void> {
    const spliceImage = `ghcr.io/digital-asset/decentralized-canton-sync/docker/splice-app:${spliceVersion}`

    if (
        PACKAGES.every((pkg) =>
            fs.existsSync(path.join(DEST_DIR, `${pkg}-current.dar`))
        )
    ) {
        console.log(
            info(`DARs already present in ${DEST_DIR}, skipping fetch.`)
        )
        return
    }

    console.log(info(`Reading token-standard DARs out of ${spliceImage}...`))
    await ensureDir(DEST_DIR)

    const container = execSync(`docker create ${spliceImage}`, {
        encoding: 'utf-8',
    }).trim()

    try {
        for (const pkg of PACKAGES) {
            const darName = `${pkg}-current.dar`
            execSync(
                `docker cp ${container}:/app/splice-node/dars/${darName} ${path.join(DEST_DIR, darName)}`,
                { stdio: 'inherit' }
            )
        }
    } finally {
        execSync(`docker rm --force ${container}`, { stdio: 'ignore' })
    }

    console.log(info(`DARs written to ${DEST_DIR}`))
}

function hasDocker(): boolean {
    try {
        execSync('docker version', { stdio: 'ignore' })
        return true
    } catch {
        console.log(warn('docker daemon not reachable'))
        return false
    }
}

async function main() {
    if (!hasDocker()) {
        console.error(
            error(
                'docker not found; it is what the token-standard DARs are read from'
            )
        )
        process.exit(1)
    }
    await fetchTrafficPurchaseDars()
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((e) => {
        console.error(error(e.message || e))
        process.exit(1)
    })
}
