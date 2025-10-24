// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    error,
    ensureDir,
    SPLICE_VERSION,
    downloadAndUnpackTarball,
    LOCALNET_ARCHIVE_HASH,
} from './lib/utils.js'
import path from 'path'

const LOCALNET_PATH = path.join(process.cwd(), '.localnet')
const TAR_FILENAME = `${SPLICE_VERSION}_splice-node.tar.gz`
const TAR_PATH = path.join(LOCALNET_PATH, TAR_FILENAME)
const DOWNLOAD_URL = `https://github.com/digital-asset/decentralized-canton-sync/releases/download/v${SPLICE_VERSION}/${SPLICE_VERSION}_splice-node.tar.gz`

async function main() {
    const updateHash = process.argv.includes('--updateHash')
    await ensureDir(LOCALNET_PATH)

    await downloadAndUnpackTarball(DOWNLOAD_URL, TAR_PATH, LOCALNET_PATH, {
        hash: LOCALNET_ARCHIVE_HASH,
        strip: 1,
        updateHash,
    })
}

main().catch((e) => {
    console.error(error(e.message || e))
    process.exit(1)
})
