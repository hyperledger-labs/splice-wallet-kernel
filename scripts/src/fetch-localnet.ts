import { info, error, success, ensureDir, SPLICE_VERSION } from './utils.js'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import tar from 'tar-fs'
import { pipeline } from 'stream/promises'

const LOCALNET_PATH = path.join(process.cwd(), '.localnet')
const TAR_FILENAME = `${SPLICE_VERSION}_splice-node.tar.gz`
const TAR_PATH = path.join(LOCALNET_PATH, TAR_FILENAME)
const DOWNLOAD_URL = `https://github.com/digital-asset/decentralized-canton-sync/releases/download/v${SPLICE_VERSION}/${SPLICE_VERSION}_splice-node.tar.gz`

async function downloadLocalnetTarGz(tarfile: string): Promise<void> {
    console.log(
        info(`Downloading splice-node ${SPLICE_VERSION} to ${tarfile}...`)
    )

    const res = await fetch(DOWNLOAD_URL)
    if (!res.ok || !res.body) {
        throw new Error(`Failed to download: ${DOWNLOAD_URL}`)
    }
    await pipeline(res.body, fs.createWriteStream(tarfile))
    console.log(success('Download complete.'))
}

async function main() {
    await ensureDir(LOCALNET_PATH)

    if (fs.existsSync(TAR_PATH)) {
        console.log(info('splice-node tarball already downloaded.'))
    } else {
        await downloadLocalnetTarGz(TAR_PATH)
    }

    // Unpack tarball into .localnet
    console.log(info('Unpacking splice-node tarball...'))
    await pipeline(
        fs.createReadStream(TAR_PATH),
        zlib.createGunzip(),
        tar.extract(LOCALNET_PATH, { strip: 1 })
    )
    console.log(success(`Unpacked splice-node into ${LOCALNET_PATH}`))
}

main().catch((e) => {
    console.error(error(e.message || e))
    process.exit(1)
})
