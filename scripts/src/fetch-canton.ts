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
    info,
    success,
} from './utils.js'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import tar from 'tar-fs'
import { pipeline } from 'stream/promises'

async function downloadCantonTarGz(tarfile: string): Promise<void> {
    console.log(info(`Downloading Canton ${CANTON_VERSION} to ${tarfile}...`))

    const archiveUrl = `https://github.com/digital-asset/daml/releases/download/v${DAML_RELEASE_VERSION}/canton-open-source-${CANTON_VERSION}.tar.gz`

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

    if (downloadedHash !== CANTON_ARCHIVE_HASH) {
        console.log(
            error(
                `SHA256 checksum mismatch for downloaded Canton binary.\n\tExpected: ${CANTON_ARCHIVE_HASH}\n\tReceived: ${downloadedHash}`
            )
        )
        process.exit(1)
    } else {
        console.log(success('SHA256 checksum verified successfully.'))
    }
}

async function main() {
    await ensureDir(CANTON_PATH)
    const tarfile = path.join(CANTON_PATH, 'canton.tar.gz')

    if (fs.existsSync(tarfile)) {
        console.log(
            info('Canton binary already downloaded... verifying checksum')
        )
        await verifyFileIntegrity(tarfile)
    } else {
        await downloadCantonTarGz(tarfile)
    }

    await pipeline(
        fs.createReadStream(tarfile),
        zlib.createGunzip(),
        tar.extract(CANTON_PATH, { strip: 1 })
    )
}

main()
