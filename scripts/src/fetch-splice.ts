// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Download a copy of the Splice binary from the open-source repository
 * and place it in the splice/ directory.
 */

import {
    error,
    SPLICE_PATH,
    downloadAndUnpackTarball,
    Network,
    getNetworkArg,
    SUPPORTED_VERSIONS,
} from './lib/utils.js'
import path from 'path'

async function main(network: Network = 'devnet') {
    const spliceVersion = SUPPORTED_VERSIONS[network].splice.version
    const updateHash = process.argv.includes('--updateHash')
    const archiveUrl = `https://github.com/hyperledger-labs/splice/archive/refs/tags/${spliceVersion}.tar.gz`
    const tarfile = path.join(SPLICE_PATH, `${spliceVersion}.tar.gz`)

    await downloadAndUnpackTarball(archiveUrl, tarfile, SPLICE_PATH, {
        hash: SUPPORTED_VERSIONS[network].splice.hashes.splice,
        strip: 1,
        updateHash,
    })
}

main(getNetworkArg()).catch((e) => {
    console.error(error(e.message || e))
    process.exit(1)
})
