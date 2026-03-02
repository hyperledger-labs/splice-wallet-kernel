// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    error,
    ensureDir,
    downloadAndUnpackTarball,
    type Network,
    SUPPORTED_VERSIONS,
    getNetworkArg,
    hasFlag,
    setSpliceHash,
} from './lib/utils.js'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

const LOCALNET_PATH = path.join(process.cwd(), '.localnet')

async function main(network: Network = 'devnet') {
    const spliceVersion = SUPPORTED_VERSIONS[network].splice.version
    const TAR_FILENAME = `${spliceVersion}_splice-node.tar.gz`
    const TAR_PATH = path.join(LOCALNET_PATH, TAR_FILENAME)
    const DOWNLOAD_URL = `https://github.com/digital-asset/decentralized-canton-sync/releases/download/v${spliceVersion}/${spliceVersion}_splice-node.tar.gz`

    const updateHash = hasFlag('updateHash')
    await ensureDir(LOCALNET_PATH)

    await downloadAndUnpackTarball(DOWNLOAD_URL, TAR_PATH, LOCALNET_PATH, {
        hash: SUPPORTED_VERSIONS[network].splice.hashes.localnet,
        strip: 1,
        updateHash,
    })

    if (updateHash || !SUPPORTED_VERSIONS[network].splice.hashes.localnet) {
        const newHash = crypto
            .createHash('sha256')
            .update(fs.readFileSync(TAR_PATH))
            .digest('hex')
        setSpliceHash(network, 'localnet', newHash)
    }
}

main(getNetworkArg()).catch((e) => {
    console.error(error(e.message || e))
    process.exit(1)
})
