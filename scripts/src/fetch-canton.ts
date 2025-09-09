// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Download a copy of the Canton binary from the open-source repository
 * and place it in the canton/ directory.
 */

import path from 'path'
import {
    API_SPECS_PATH,
    CANTON_ARCHIVE_HASH,
    CANTON_PATH,
    CANTON_VERSION,
    downloadAndUnpackTarball,
    error,
} from './utils.js'
import * as fs from 'fs'

async function main() {
    const tarfile = path.join(CANTON_PATH, 'canton.tar.gz')
    const archiveUrl = `https://www.canton.io/releases/canton-open-source-${CANTON_VERSION}.tar.gz`

    await downloadAndUnpackTarball(archiveUrl, tarfile, CANTON_PATH, {
        hash: CANTON_ARCHIVE_HASH,
        strip: 1,
    })

    const CANTON_MAJOR_VERSION = CANTON_VERSION.split('-')[0]
    fs.copyFileSync(
        path.join(CANTON_PATH, '/examples/09-json-api/typescript/openapi.yaml'),
        path.join(
            API_SPECS_PATH,
            `ledger-api/${CANTON_MAJOR_VERSION}/openapi.yaml`
        )
    )
}

main().catch((e) => {
    console.error(error(e.message || e))
    process.exit(1)
})
