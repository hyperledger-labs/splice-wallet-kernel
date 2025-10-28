// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Download a copy of the Canton binary from the open-source repository
 * and place it in the canton/ directory.
 */

import path from 'path'
import {
    API_SPECS_PATH,
    SUPPORTED_VERSIONS,
    CANTON_PATH,
    downloadAndUnpackTarball,
    CantonVersionAndHash,
    error,
} from './lib/utils.js'
import * as fs from 'fs'

async function fetchCanton(
    cantonVersions: CantonVersionAndHash,
    updateHash: boolean
) {
    const tarfile = path.join(
        CANTON_PATH,
        cantonVersions.version,
        'canton.tar.gz'
    )
    const archiveUrl = `https://www.canton.io/releases/canton-open-source-${cantonVersions.version}.tar.gz`
    const cantonDownloadPath = path.join(CANTON_PATH, cantonVersions.version)

    console.log(cantonDownloadPath)
    await downloadAndUnpackTarball(archiveUrl, tarfile, cantonDownloadPath, {
        hash: cantonVersions.hash,
        strip: 1,
        updateHash,
    })

    const CANTON_MAJOR_VERSION = cantonVersions.version.split('-')[0]
    if (!fs.existsSync(cantonDownloadPath)) {
        fs.mkdirSync(cantonDownloadPath, { recursive: true })
    }

    fs.copyFileSync(
        path.join(
            cantonDownloadPath,
            '/examples/09-json-api/typescript/openapi.yaml'
        ),
        path.join(
            API_SPECS_PATH,
            `ledger-api/${CANTON_MAJOR_VERSION}/openapi.yaml`
        )
    )
}

async function main() {
    const updateHash = process.argv.includes('--updateHash')
    await Promise.all(
        Object.entries(SUPPORTED_VERSIONS).map(async ([env, data]) => {
            const { version, hash } = data.canton
            console.debug(`fetching canton for ${env}`)
            await fetchCanton({ version, hash }, updateHash)
        })
    )
}

main().catch((e) => {
    console.error(error(e.message || e))
    process.exit(1)
})
