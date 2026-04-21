// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs/promises'
import path from 'path'
import { getRepoRoot } from './lib/utils.js'

/**
 * Downloads required DARs for Example 15 (Multi-Sync Trade) from the
 * token-standard-v2-upcoming branch of the Splice repository.
 *
 * These DARs are NOT included in the default localnet release and must
 * be manually downloaded before running example 15.
 *
 * Usage: tsx scripts/src/setup-example-15.ts
 */

const SPLICE_REPO_URL =
    'https://raw.githubusercontent.com/hyperledger-labs/splice/token-standard-v2-upcoming/daml/dars'

const DARS_TO_DOWNLOAD = [
    'splice-token-test-trading-app-v2-1.0.0.dar',
    'splice-test-token-v1-1.0.0.dar',
]

async function downloadFile(url: string, filePath: string): Promise<void> {
    console.log(`Downloading ${url}...`)
    const response = await fetch(url)

    if (!response.ok) {
        throw new Error(
            `Failed to download ${url}: ${response.status} ${response.statusText}`
        )
    }

    const buffer = await response.arrayBuffer()
    await fs.writeFile(filePath, Buffer.from(buffer))
    console.log(`✓ Saved to ${filePath}`)
}

async function main() {
    const repoRoot = getRepoRoot()
    const darsDir = path.join(repoRoot, '.localnet', 'dars')

    // Ensure .localnet/dars directory exists
    await fs.mkdir(darsDir, { recursive: true })

    console.log('Setting up Example 15 DARs...\n')
    console.log(`Target directory: ${darsDir}\n`)

    let downloadedCount = 0
    let skippedCount = 0

    for (const dar of DARS_TO_DOWNLOAD) {
        const filePath = path.join(darsDir, dar)
        const url = `${SPLICE_REPO_URL}/${dar}`

        // Check if file already exists
        try {
            await fs.stat(filePath)
            console.log(`⊘ ${dar} already exists, skipping...`)
            skippedCount++
        } catch {
            // File doesn't exist, download it
            try {
                await downloadFile(url, filePath)
                downloadedCount++
            } catch (err) {
                console.error(`✗ Failed to download ${dar}:`, err)
                process.exit(1)
            }
        }
    }

    console.log(`\n✓ Setup complete!`)
    console.log(`  Downloaded: ${downloadedCount}`)
    console.log(`  Skipped (already exists): ${skippedCount}`)
    console.log(`\nYou can now run Example 15 with:`)
    console.log(`  yarn run-15`)
    console.log(`\nor in multi-sync mode:`)
    console.log(`  yarn start:localnet --multi-sync`)
    console.log(`  yarn run-15`)
}

main().catch((err) => {
    console.error('Setup failed:', err)
    process.exit(1)
})
