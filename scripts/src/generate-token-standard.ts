// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path'
import { execSync } from 'child_process'
import {
    getRepoRoot,
    info,
    warn,
    error,
    getAllFilesWithExtension,
    ensureDir,
    copyFileRecursive,
} from './utils.js'
import { installDamlSDK } from './install-daml-sdk.js'

const repoRoot = getRepoRoot()
const SRC_DIR = path.join(repoRoot, '.splice/token-standard')
const DEST_DIR = path.join(repoRoot, 'core/token-standard')

async function main() {
    console.log(info('Finding .daml files...'))
    const damlFiles = getAllFilesWithExtension(SRC_DIR, '.daml')

    if (damlFiles.length === 0) {
        console.log(warn('No .daml files found.'))
        return
    }

    await installDamlSDK()

    await ensureDir(DEST_DIR)

    console.log(
        info(`Copying ${damlFiles.length} .daml files to ${DEST_DIR}...`)
    )
    const copiedFiles: string[] = []
    for (const file of damlFiles) {
        if (file.includes('test')) continue // Skip test files
        const relativePath = path.relative(SRC_DIR, file)
        const parts = relativePath.split(path.sep)
        const newRelativePath =
            parts.length > 1 ? path.join(...parts.slice(1)) : relativePath
        const destPath = path.join(DEST_DIR, newRelativePath)
        await ensureDir(path.dirname(destPath))
        await copyFileRecursive(file, destPath)
        copiedFiles.push(destPath)
    }

    console.log(info('Running "daml build"...'))
    execSync('exec daml build', {
        cwd: DEST_DIR,
        stdio: 'inherit',
    })

    console.log(info('Running "daml codegen js"...'))
    try {
        console.log(info(`exec daml codegen js`))
        execSync(
            `exec daml codegen js .daml/dist/token-standard-models-1.0.0.dar -o src`,
            { cwd: DEST_DIR, stdio: 'inherit' }
        )
        console.log(info('Codegen completed.'))
    } catch (err) {
        console.error(error(`Error running daml codegen js: ${err}`))
    }

    // Remove copied .daml files
    /*for (const file of copiedFiles) {
        try {
            fs.unlinkSync(file);
        } catch (err) {
            console.error(warn(`Failed to remove ${file}: ${err}`));
        }
    }
    console.log(info('Removed copied .daml files.'));*/
}

main()
