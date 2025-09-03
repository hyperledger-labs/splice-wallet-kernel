// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'fs'
import * as path from 'path'
import generateSchema from 'openapi-typescript'
import {
    getRepoRoot,
    info,
    warn,
    error,
    success,
    SPLICE_SPEC_PATH,
    getAllFilesWithExtension,
    ensureDir,
    copyFileRecursive,
    traverseDirectory,
    API_SPECS_PATH,
} from './utils.js'

const SRC_DIR = SPLICE_SPEC_PATH
const OUTPUT_SPECS_DIR = path.join(API_SPECS_PATH, 'validator')
const OUTPUT_CLIENTS_DIR = path.join(
    getRepoRoot(),
    'core',
    'scan-client',
    'src',
    'generated-clients'
)

async function extractOpenApiSpecs(src_dir: string, specs_to_copy: string[]) {
    if (!fs.existsSync(src_dir)) {
        console.log(
            warn(
                `Source directory not found: ${src_dir}. Make sure the Splice repo is downloaded into "${SPLICE_SPEC_PATH}".`
            )
        )
        return 0
    }

    console.log(info(`Scanning for OpenAPI YAMLs under ${src_dir} ...`))

    const yamlFiles = [
        ...getAllFilesWithExtension(src_dir, '.yaml'),
        ...getAllFilesWithExtension(src_dir, '.yml'),
    ].filter((p) => specs_to_copy.some((spec) => p.includes(spec)))

    if (yamlFiles.length === 0) {
        console.log(
            warn('No OpenAPI YAML files found inside any "openapi/" folder.')
        )
        return 0
    }

    await ensureDir(OUTPUT_SPECS_DIR)

    let copiedCount = 0
    const byPackage = new Map<string, string[]>()

    for (const srcFile of yamlFiles) {
        const rel = path.relative(src_dir, srcFile)
        const parts = rel.split(path.sep)
        const pkg = parts[0] // first-level package dir under token-standard

        if (!pkg) {
            console.log(warn(`Skipping unexpected path: ${srcFile}`))
            continue
        }

        const outputDir = OUTPUT_SPECS_DIR
        await ensureDir(outputDir)

        const outputFile = path.join(outputDir, path.basename(srcFile))

        try {
            await copyFileRecursive(srcFile, outputFile)
            copiedCount++

            if (!byPackage.has(pkg)) byPackage.set(pkg, [])
            byPackage.get(pkg)!.push(path.basename(outputFile))
        } catch (e) {
            console.error(
                error(`Failed to copy "${srcFile}" -> "${outputFile}": ${e}`)
            )
        }
    }

    console.log(
        success(`Copied ${copiedCount} OpenAPI file(s) to ${OUTPUT_SPECS_DIR}.`)
    )
    return copiedCount
}

async function generateClientsFromSpecs() {
    if (!fs.existsSync(OUTPUT_SPECS_DIR)) {
        console.log(error(`Specs directory not found: ${OUTPUT_SPECS_DIR}`))
        process.exit(1)
    }

    console.log(
        info(`Generating clients from specs in ${OUTPUT_SPECS_DIR} ...`)
    )
    await ensureDir(OUTPUT_CLIENTS_DIR)

    const yamlFiles: string[] = []
    traverseDirectory(OUTPUT_SPECS_DIR, (p) => {
        const base = path.basename(p)
        const isYaml = base.endsWith('.yaml') || base.endsWith('.yml')
        if (isYaml && !/docker-compose/i.test(base)) {
            yamlFiles.push(p)
        }
    })
    console.log(yamlFiles)

    if (yamlFiles.length === 0) {
        console.log(warn('No OpenAPI YAML files found (after exclusions).'))
        return 0
    }

    let generatedCount = 0
    for (const inputPath of yamlFiles.sort()) {
        const outDir = OUTPUT_CLIENTS_DIR
        await ensureDir(outDir)

        const outFile = path
            .basename(inputPath)
            .replace(/\.(yaml|yml)$/i, '.ts')
        const outputPath = path.join(outDir, outFile)

        try {
            if (!/common/i.test(path.basename(inputPath))) {
                const schema = await generateSchema(inputPath)
                fs.writeFileSync(outputPath, schema)
                generatedCount++
            }
        } catch (e) {
            console.error(
                error(
                    `Failed to generate from ${path.relative(
                        OUTPUT_SPECS_DIR,
                        inputPath
                    )}: ${e instanceof Error ? e.message : String(e)}`
                )
            )
        }
    }

    console.log(
        success(
            `Generated ${generatedCount} TypeScript clients into ${OUTPUT_CLIENTS_DIR}`
        )
    )
    return generatedCount
}

export async function generateClients() {
    try {
        const copiedCount = await extractOpenApiSpecs(SRC_DIR, ['scan.yaml'])
        // Even if nothing copied from SPLICE_PATH, try to generate from whatever is in OUTPUT_SPECS_DIR
        const generated = await generateClientsFromSpecs()
        console.log(
            success(
                `Done. Specs copied: ${copiedCount}, clients generated: ${generated}.`
            )
        )
    } catch (e) {
        console.error(
            error(
                `Unexpected error: ${e instanceof Error ? e.message : String(e)}`
            )
        )
        process.exit(1)
    }
}

generateClients()
