// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'
import {
    error,
    success,
    getRepoRoot,
    VERSIONS_CONFIG_PATH,
    getArgValue,
    getNetworkArg,
    SupportedVersions,
} from './lib/utils.js'

function usageAndExit() {
    console.error(
        'Usage: upgrade-splice.ts --spliceVersion=<version> [--network=devnet|mainnet]'
    )
    process.exit(1)
}

const spliceVersion = (() => {
    const v = getArgValue('spliceVersion')
    if (!v) usageAndExit()
    return v as string
})()
const network = getNetworkArg()

const repoRoot = getRepoRoot()
const cantonSourcesPath = path.join(repoRoot, '.splice/nix/canton-sources.json')

// Step 1: Update SPLICE_VERSION in version-config.json
const versionConfigRaw = fs.readFileSync(VERSIONS_CONFIG_PATH, 'utf8')
const versionConfig = JSON.parse(versionConfigRaw) as {
    DAML_RELEASE_VERSION: string
    SUPPORTED_VERSIONS: SupportedVersions
}

versionConfig.SUPPORTED_VERSIONS[network].splice.version = spliceVersion
fs.writeFileSync(
    VERSIONS_CONFIG_PATH,
    JSON.stringify(versionConfig, null, 4) + '\n',
    'utf8'
)

// Step 2: Run fetch-splice.ts with --updateHash
try {
    const fetchSplice = spawnSync(
        'tsx',
        [
            path.join(repoRoot, 'scripts/src/fetch-splice.ts'),
            `--network=${network}`,
            '--updateHash',
        ],
        { stdio: 'inherit' }
    )
    if (fetchSplice.status !== 0) throw new Error('fetch-splice.ts failed')
} catch {
    console.error(error('fetch-splice.ts failed, roll back changes using git.'))
    process.exit(1)
}

// Step 3: Update DAML_RELEASE_VERSION and SUPPORTED_VERSIONS in utils.ts
try {
    if (!fs.existsSync(cantonSourcesPath))
        throw new Error('.splice/nix/canton-sources.json not found')

    const cantonSources = JSON.parse(fs.readFileSync(cantonSourcesPath, 'utf8'))
    const damlRelease = cantonSources['version']?.replace(/^v/, '')
    if (!damlRelease)
        throw new Error('version not found in canton-sources.json')

    // Reload latest version-config in case Step 2 changed hashes
    const versionConfigRaw = fs.readFileSync(VERSIONS_CONFIG_PATH, 'utf8')
    const versionConfig = JSON.parse(versionConfigRaw)

    // Update DAML_RELEASE_VERSION, but only when upgrading for devnet
    if (network === 'devnet') {
        versionConfig.DAML_RELEASE_VERSION = damlRelease
    }

    // Update SUPPORTED_VERSIONS.*.canton.version (match on major.minor)
    const majorMinor = damlRelease
        .split('-')[0]
        .split('.')
        .slice(0, 2)
        .join('.')

    // for (const env of Object.keys(versionConfig.SUPPORTED_VERSIONS) as Array<
    //     keyof typeof versionConfig.SUPPORTED_VERSIONS
    // >) {
    const envConfig = versionConfig.SUPPORTED_VERSIONS[network]
    const canton = envConfig.canton
    const currentMajorMinor = canton.version
        .split('-')[0]
        .split('.')
        .slice(0, 2)
        .join('.')

    if (currentMajorMinor === majorMinor) {
        canton.version = cantonSources['version']
    }
    // }

    fs.writeFileSync(
        VERSIONS_CONFIG_PATH,
        JSON.stringify(versionConfig, null, 4) + '\n',
        'utf8'
    )
} catch {
    console.error(
        error('Failed to update DAML_RELEASE_VERSION or SUPPORTED_VERSIONS.')
    )
    process.exit(1)
}

// Step 4: Run fetch-localnet, fetch-canton, generate-openapi-clients with --updateHash
const scripts = [
    'fetch-localnet.ts',
    'fetch-canton.ts',
    'generate-openapi-clients.ts',
]
for (const script of scripts) {
    try {
        const result = spawnSync(
            'tsx',
            [
                path.join(repoRoot, 'scripts/src', script),
                `--network=${network}`,
                '--updateHash',
            ],
            { stdio: 'inherit' }
        )
        if (result.status !== 0) throw new Error(`${script} failed`)
    } catch {
        console.error(error(`${script} failed`))
        process.exit(1)
    }
}
console.log(success('Upgrade completed successfully.'))
