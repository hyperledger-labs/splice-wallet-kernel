// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * Download a copy of the Splice binary from the open-source repository
 * and place it in the splice/ directory.
 */

import {
    SPLICE_VERSION,
    error,
    info,
    success,
    SPLICE_SPEC_PATH,
    SPLICE_SPEC_ARCHIVE_HASH,
    ensureDir,
} from './utils.js'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import tar from 'tar-fs'
import { pipeline } from 'stream/promises'

async function downloadSpliceTarGz(tarfile: string): Promise<void> {
    console.log(
        info(`Downloading Splice Spec ${SPLICE_VERSION} to ${tarfile}...`)
    )

    const archiveUrl = `https://github.com/digital-asset/decentralized-canton-sync/releases/download/v${SPLICE_VERSION}/${SPLICE_VERSION}_openapi.tar.gz`
    // https://github.com/digital-asset/decentralized-canton-sync/releases/download/v0.4.11/0.4.11_openapi.tar.gz
    const res = await fetch(archiveUrl)

    if (res.body) {
        await pipeline(res.body, fs.createWriteStream(tarfile))
        await verifyFileIntegrity(tarfile)
    }
}

async function verifyFileIntegrity(tarfile: string): Promise<void> {
    const downloadedHash = crypto
        .createHash('sha256')
        .update(fs.readFileSync(tarfile))
        .digest('hex')

    if (downloadedHash !== SPLICE_SPEC_ARCHIVE_HASH) {
        console.log(
            error(
                `SHA256 checksum mismatch for downloaded Splice binary.\n\tExpected: ${SPLICE_SPEC_ARCHIVE_HASH}\n\tReceived: ${downloadedHash}`
            )
        )
        process.exit(1)
    } else {
        console.log(success('SHA256 checksum verified successfully.'))
    }
}

async function main() {
    await ensureDir(SPLICE_SPEC_PATH)

    const tarfile = path.join(SPLICE_SPEC_PATH, `${SPLICE_VERSION}.tar.gz`)

    if (fs.existsSync(tarfile)) {
        console.log(
            info('splice binary already downloaded... verifying checksum')
        )
        await verifyFileIntegrity(tarfile)
    } else {
        await downloadSpliceTarGz(tarfile)
    }

    await pipeline(
        fs.createReadStream(tarfile),
        zlib.createGunzip(),
        tar.extract(SPLICE_SPEC_PATH)
    )
}

main()
