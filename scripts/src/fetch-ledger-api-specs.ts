// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { DAML_RELEASE_VERSION, ensureDir, getRepoRoot } from './utils.js'

const rootPath = getRepoRoot()

// Variables
const REPO_OWNER = 'digital-asset'
const REPO_NAME = 'daml'
const JSON_API_DOCS =
    'sdk/canton/community/ledger/ledger-json-api/src/test/resources/json-api-docs'
const OUTPUT_DIR = `${rootPath}/temp`
const FINAL_DIR = `${rootPath}/api-specs/ledger-api`

interface GitHubFile {
    type: string
    download_url: string
}

async function fetchApiSpecs() {
    try {
        // Ensure output directories exist
        await ensureDir(OUTPUT_DIR)
        await ensureDir(FINAL_DIR)

        // Get the list of files in the folder using GitHub API
        const response = await axios.get<GitHubFile[]>(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${JSON_API_DOCS}?ref=v${DAML_RELEASE_VERSION}`
        )

        const files = response.data
            .filter((item) => item.type === 'file')
            .map((file) => file.download_url)

        for (const fileUrl of files) {
            const fileName = path.basename(fileUrl)
            const filePath = path.join(OUTPUT_DIR, fileName)

            // Download the file
            const fileResponse = await axios.get(fileUrl, {
                responseType: 'arraybuffer',
            })
            fs.writeFileSync(filePath, fileResponse.data)

            // Extract version and rename the file
            const fileContent = fs.readFileSync(filePath, 'utf-8')
            const versionMatch = fileContent.match(/^ {2}version:\s*(.+)$/m)
            const version = versionMatch
                ? versionMatch[1].replace(/"/g, '')
                : null

            if (version) {
                const extension = path.extname(fileName)
                const newFileName = `${path.basename(fileName, extension)}-${version}${extension}`
                fs.renameSync(filePath, path.join(OUTPUT_DIR, newFileName))
            }
        }

        // Move files to the final directory
        const filesToMove = fs.readdirSync(OUTPUT_DIR)
        for (const file of filesToMove) {
            fs.renameSync(
                path.join(OUTPUT_DIR, file),
                path.join(FINAL_DIR, file)
            )
        }

        // Clean up temporary directory
        fs.rmSync(OUTPUT_DIR, { recursive: true, force: true })

        console.log(`Downloaded API Specs into ${FINAL_DIR}`)
    } catch (error) {
        console.error('Error fetching API specs:', error)
    }
}

fetchApiSpecs()
