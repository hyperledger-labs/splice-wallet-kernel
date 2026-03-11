// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const packageRoot = resolve(__dirname, '..')
const repoRoot = resolve(packageRoot, '..', '..')

const files = ['openrpc-dapp-api.json', 'openrpc-dapp-remote-api.json'] as const

async function main(): Promise<void> {
    const sourceDir = resolve(repoRoot, 'api-specs')
    const targetDir = resolve(packageRoot, 'specs')
    await mkdir(targetDir, { recursive: true })

    for (const fileName of files) {
        const sourcePath = resolve(sourceDir, fileName)
        const targetPath = resolve(targetDir, fileName)
        await copyFile(sourcePath, targetPath)
    }
}

void main()
