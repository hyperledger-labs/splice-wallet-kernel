// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Download a copy of the Splice binary from the open-source repository
 * and place it in the splice/ directory.
 */

import {
    SPLICE_VERSION,
    error,
    SPLICE_PATH,
    SPLICE_ARCHIVE_HASH,
    downloadAndUnpackTarball,
} from './utils.js'
import path from 'path'

async function main() {
    const archiveUrl = `https://github.com/hyperledger-labs/splice/archive/refs/tags/${SPLICE_VERSION}.tar.gz`
    const tarfile = path.join(SPLICE_PATH, `${SPLICE_VERSION}.tar.gz`)

    await downloadAndUnpackTarball(archiveUrl, tarfile, SPLICE_PATH, {
        hash: SPLICE_ARCHIVE_HASH,
        strip: 1,
    })
}

main().catch((e) => {
    console.error(error(e.message || e))
    process.exit(1)
})
