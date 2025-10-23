// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'
import { error, success, getRepoRoot } from './lib/utils.js'

function usageAndExit() {
    console.error('Usage: upgrade-splice.ts <spliceVersion>')
    process.exit(1)
}

if (process.argv.length < 3) usageAndExit()

const spliceVersion = process.argv[2]
const repoRoot = getRepoRoot()
const utilsPath = path.join(repoRoot, 'scripts/src/lib/utils.ts')
const cantonSourcesPath = path.join(repoRoot, '.splice/nix/canton-sources.json')

// Helper to backup and restore files
//function backupFile(filePath: string) {
//    const backupPath = filePath + '.bak'
//    fs.copyFileSync(filePath, backupPath)
//    return backupPath
//}
function restoreFile(filePath: string) {
    const backupPath = filePath + '.bak'
    if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, filePath)
        fs.unlinkSync(backupPath)
    }
}
function cleanupBackups(filePath: string) {
    const backupPath = filePath + '.bak'
    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath)
}

// Step 1: Update SPLICE_VERSION in utils.ts
//const utilsBackup = backupFile(utilsPath)
let utilsContent = fs.readFileSync(utilsPath, 'utf8')
const spliceVersionRegex = /export const SPLICE_VERSION = '([^']+)'/
if (!spliceVersionRegex.test(utilsContent)) {
    console.error(error('SPLICE_VERSION not found in utils.ts'))
    process.exit(1)
}
utilsContent = utilsContent.replace(
    spliceVersionRegex,
    `export const SPLICE_VERSION = '${spliceVersion}'`
)
fs.writeFileSync(utilsPath, utilsContent, 'utf8')

// Step 2: Run fetch-splice.ts with --updateHash
try {
    const fetchSplice = spawnSync(
        'node',
        [path.join(repoRoot, 'scripts/src/fetch-splice.ts'), '--updateHash'],
        { stdio: 'inherit' }
    )
    if (fetchSplice.status !== 0) throw new Error('fetch-splice.ts failed')
} catch {
    console.error(error('fetch-splice.ts failed, rolling back changes.'))
    restoreFile(utilsPath)
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
    // Update DAML_RELEASE_VERSION
    utilsContent = fs.readFileSync(utilsPath, 'utf8')
    const damlRegex = /export const DAML_RELEASE_VERSION = '([^']+)'/
    if (!damlRegex.test(utilsContent))
        throw new Error('DAML_RELEASE_VERSION not found in utils.ts')
    utilsContent = utilsContent.replace(
        damlRegex,
        `export const DAML_RELEASE_VERSION = '${damlRelease}'`
    )
    // Update SUPPORTED_VERSIONS (match on major.minor)
    const majorMinor = damlRelease
        .split('-')[0]
        .split('.')
        .slice(0, 2)
        .join('.')
    const supportedRegex =
        /(SUPPORTED_VERSIONS\s*=\s*{[\s\S]*?)(version: ')([^']+)'/g
    utilsContent = utilsContent.replace(supportedRegex, (match, p1, p2, p3) => {
        if (p3.startsWith(majorMinor)) {
            return p1 + p2 + cantonSources['version'] + "'"
        }
        return match
    })
    fs.writeFileSync(utilsPath, utilsContent, 'utf8')
} catch {
    console.error(
        error(
            'Failed to update DAML_RELEASE_VERSION or SUPPORTED_VERSIONS, rolling back.'
        )
    )
    restoreFile(utilsPath)
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
            'node',
            [path.join(repoRoot, 'scripts/src', script), '--updateHash'],
            { stdio: 'inherit' }
        )
        if (result.status !== 0) throw new Error(`${script} failed`)
    } catch {
        console.error(error(`${script} failed, rolling back changes.`))
        restoreFile(utilsPath)
        process.exit(1)
    }
}

cleanupBackups(utilsPath)
console.log(success('Upgrade completed successfully.'))
