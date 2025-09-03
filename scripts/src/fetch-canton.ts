// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * Download a copy of the Canton binary from the open-source repository
 * and place it in the canton/ directory.
 */

import {
    CANTON_ARCHIVE_HASH,
    CANTON_PATH,
    CANTON_VERSION,
    DAML_RELEASE_VERSION,
    ensureDir,
    error,
    downloadAndUnpackTarball,
} from './utils.js'
import path from 'path'

async function main() {
    await ensureDir(CANTON_PATH)
    const tarfile = path.join(CANTON_PATH, 'canton.tar.gz')
    const archiveUrl = `https://github.com/digital-asset/daml/releases/download/v${DAML_RELEASE_VERSION}/canton-open-source-${CANTON_VERSION}.tar.gz`

    await downloadAndUnpackTarball(archiveUrl, tarfile, CANTON_PATH, {
        hash: CANTON_ARCHIVE_HASH,
        strip: 1,
    })
}

main().catch((e) => {
    console.error(error(e.message || e))
    process.exit(1)
})
