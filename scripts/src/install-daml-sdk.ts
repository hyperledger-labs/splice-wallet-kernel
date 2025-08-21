import { execSync } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {
    DAML_RELEASE_VERSION,
    getRepoRoot,
    info,
    warn,
    success,
    error,
} from './utils.js'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { ReadableStream } from 'stream/web'

//this is done for comparison, the DAML_RELEASE_VERSION uses snapshot releases but the installed sdk included commit and might have a different minor version.
function compareDamlVersionWithInstalledSDK(daml_version: string): boolean {
    const daml_installed = execSync('daml version', { encoding: 'utf8' })

    function parseVersion(version: string) {
        const match = version.match(
            /^([0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9]+)?)(?:\.(\d+))?/
        )
        if (!match) throw new Error(`Invalid version format: ${version}`)
        return {
            prefix: match[1],
            snapshot: match[2] ? parseInt(match[2], 10) : undefined,
        }
    }

    const parsed = parseVersion(daml_version)

    //we check if the sdk versions includes the major version of the requested
    return daml_installed.includes(parsed.prefix)
}

export async function installDamlSDK() {
    if (compareDamlVersionWithInstalledSDK(DAML_RELEASE_VERSION)) {
        console.log(
            success(
                `Daml SDK version ${DAML_RELEASE_VERSION} is already installed.`
            )
        )
        return
    }

    const TEMP_DIR = `${getRepoRoot()}/temp`

    const osType = os.platform()

    const fetchAssetList = await fetch(
        `https://api.github.com/repos/digital-asset/daml/releases/tags/v${DAML_RELEASE_VERSION}`
    )

    if (!fetchAssetList.ok) {
        console.error(
            error(
                `Failed to fetch release information: ${fetchAssetList.statusText}`
            )
        )
        process.exit(1)
    }

    const assets = await fetchAssetList.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assetNames: string[] = assets.assets.map((a: any) => a.name)
    const targetAsset = assetNames.find(
        (name: string) =>
            name.startsWith('daml-sdk-') && name.endsWith(`${osType}.tar.gz`)
    )

    if (targetAsset === undefined) {
        console.log(
            warn(
                `There is currently no daml sdk available for ${osType} in version ${DAML_RELEASE_VERSION}.`
            )
        )
        console.log(
            warn(
                `Maybe you need to create a specific mapping for your OS in scripts/src/install-daml-sdk.ts?`
            )
        )
        process.exit(1)
    }

    const url = `https://github.com/digital-asset/daml/releases/download/v${DAML_RELEASE_VERSION}/${targetAsset}`

    const tarball = path.join(TEMP_DIR, 'daml-sdk.tar.gz')
    console.log(
        info(`== Downloading Daml SDK ${DAML_RELEASE_VERSION} for ${osType} ==`)
    )
    console.log(info(`from: ${url}`))
    console.log(info(`to: ${tarball}`))
    console.log(info(`== This may take a while... ==`))

    await (async () => {
        const response = await fetch(url)
        if (!response.ok) {
            console.error(
                error(`Failed to download tarball: ${response.statusText}`)
            )
            process.exit(1)
        }
        await pipeline(
            Readable.fromWeb(response.body as ReadableStream),
            fs.createWriteStream(tarball)
        )
        console.log(
            info(`== Installing Daml SDK version: ${DAML_RELEASE_VERSION} ==`)
        )
        execSync(
            `daml install --install-assistant yes --install-with-internal-version yes "${tarball}"`,
            { stdio: 'inherit' }
        )

        fs.rmSync(TEMP_DIR, { recursive: true, force: true })
        console.log(success('== Installation complete.'))
    })()
}
