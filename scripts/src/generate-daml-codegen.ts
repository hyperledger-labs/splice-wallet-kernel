// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path'
import * as fs from 'fs'
import { getRepoRoot, info, error } from './lib/utils.js'
import { installDPM } from './install-dpm.js'
import {
    generateDamlJsBindings,
    generateDamlJsBindingsFromDar,
    DamlCodegenConfig,
} from './lib/daml-codegen.js'

const repoRoot = getRepoRoot()
const DAMLJS_ROOT = path.join(repoRoot, 'damljs')
const DARS_DIR = path.join(repoRoot, '.splice/daml/dars')

interface DamlYamlConfig {
    name: string
    version: string
    source?: string
    dependencies?: string[]
    'data-dependencies'?: string[]
}

function parseYamlList(content: string, key: string): string[] {
    const lines = content.split(/\r?\n/)
    const values: string[] = []
    let inSection = false

    for (const line of lines) {
        if (!inSection) {
            if (line.match(new RegExp(`^${key}:\\s*$`))) {
                inSection = true
            }
            continue
        }

        const itemMatch = line.match(/^\s*-\s*(.+)\s*$/)
        if (itemMatch) {
            values.push(itemMatch[1].trim())
            continue
        }

        if (line.trim() === '') {
            continue
        }

        // Reached next top-level key.
        if (!line.startsWith(' ') && !line.startsWith('\t')) {
            break
        }
    }

    return values
}

/**
 * Parse daml.yaml to extract package configuration
 */
function parseDamlYaml(filePath: string): DamlYamlConfig {
    const content = fs.readFileSync(filePath, 'utf-8')
    const config: DamlYamlConfig = {
        name: '',
        version: '1.0.0',
    }

    // Simple YAML parsing for the fields we need
    const nameMatch = content.match(/^name:\s*(.+)$/m)
    const versionMatch = content.match(/^version:\s*(.+)$/m)
    const sourceMatch = content.match(/^source:\s*(.+)$/m)

    if (nameMatch) config.name = nameMatch[1].trim()
    if (versionMatch) config.version = versionMatch[1].trim()
    if (sourceMatch) config.source = sourceMatch[1].trim()

    const dependencies = parseYamlList(content, 'dependencies')
    if (dependencies.length > 0) config.dependencies = dependencies

    const dataDependencies = parseYamlList(content, 'data-dependencies')
    if (dataDependencies.length > 0) {
        config['data-dependencies'] = dataDependencies
    }

    return config
}

/**
 * Find all codegen packages in damljs directory
 * Each package has a daml.yaml file
 */
function discoverPackages(): string[] {
    if (!fs.existsSync(DAMLJS_ROOT)) {
        console.error(error(`damljs directory not found: ${DAMLJS_ROOT}`))
        process.exit(1)
    }

    const entries = fs.readdirSync(DAMLJS_ROOT)
    const packages: string[] = []

    for (const entry of entries) {
        const packageDir = path.join(DAMLJS_ROOT, entry)
        const damlYamlPath = path.join(packageDir, 'daml.yaml')

        if (fs.existsSync(damlYamlPath)) {
            packages.push(packageDir)
        }
    }

    return packages.sort()
}

/**
 * Determine if a package is source-based (has source code) or DAR-based (pre-built)
 */
function isSourceBased(damlYaml: DamlYamlConfig): boolean {
    return damlYaml.source !== undefined && damlYaml.source !== ''
}

/**
 * Find the corresponding DAR file for a pre-built package.
 * First checks the package directory itself, then falls back to .splice/daml/dars/.
 */
function findDarFile(packageName: string, packageDir: string): string | null {
    const findMatchingDar = (dir: string): string | null => {
        if (!fs.existsSync(dir)) {
            return null
        }

        const files = fs.readdirSync(dir)
        const darFile = files.find(
            (f) => f.startsWith(packageName) && f.endsWith('.dar')
        )

        return darFile ? path.join(dir, darFile) : null
    }

    // Prefer a co-located DAR in the package directory.
    const localDar = findMatchingDar(packageDir)
    if (localDar) {
        return localDar
    }

    // Fall back to shared DAR cache.
    return findMatchingDar(DARS_DIR)
}

/**
 * Extract dependencies from daml.yaml for source-based packages
 */
function extractDependencies(
    damlYamlPath: string,
    damlYaml: DamlYamlConfig
): string[] {
    const deps: string[] = []

    if (!damlYaml['data-dependencies']) {
        return deps
    }

    const packageDir = path.dirname(damlYamlPath)

    for (const depPath of damlYaml['data-dependencies']) {
        const fullPath = path.resolve(packageDir, depPath)
        if (fs.existsSync(fullPath)) {
            deps.push(fullPath)
        }
    }

    return deps
}

/**
 * Generate DAML bindings for a discovered package
 */
async function generatePackage(
    packageDir: string,
    index: number,
    total: number
): Promise<void> {
    const damlYamlPath = path.join(packageDir, 'daml.yaml')
    const damlYaml = parseDamlYaml(damlYamlPath)

    console.log(
        info(
            `\n[${index}/${total}] Processing package: ${damlYaml.name} (${damlYaml.version})`
        )
    )

    if (isSourceBased(damlYaml)) {
        // Source-based codegen
        console.log(info(`  Type: source-based generation`))

        const sourceDir = path.join(packageDir, damlYaml.source || '.')
        const deps = extractDependencies(damlYamlPath, damlYaml)

        const config: DamlCodegenConfig = {
            sourceDir,
            destDir: packageDir,
            packageName: damlYaml.name,
            version: damlYaml.version,
            ...(deps.length > 0 ? { dependencies: deps } : {}),
        }

        await generateDamlJsBindings(config)
    } else {
        // DAR-based codegen
        const configuredDars = extractDependencies(
            damlYamlPath,
            damlYaml
        ).filter((depPath) => depPath.endsWith('.dar'))
        const darPaths =
            configuredDars.length > 0
                ? configuredDars
                : (() => {
                      const autoDarPath = findDarFile(damlYaml.name, packageDir)
                      return autoDarPath ? [autoDarPath] : []
                  })()

        if (darPaths.length === 0) {
            console.error(
                error(`  Could not find DAR file for package: ${damlYaml.name}`)
            )
            throw new Error(`Missing DAR: ${damlYaml.name}`)
        }

        if (darPaths.length === 1) {
            console.log(
                info(
                    `  Type: DAR-based generation from ${path.basename(darPaths[0])}`
                )
            )
        } else {
            console.log(
                info(
                    `  Type: DAR-based generation from ${darPaths.length} DAR files`
                )
            )
        }

        for (const darPath of darPaths) {
            await generateDamlJsBindingsFromDar(darPath, packageDir)
        }
    }

    console.log(info(`  Successfully generated ${damlYaml.name}\n`))
}

/**
 * Generate all discovered DAML codegen packages
 */
async function main() {
    console.log(info('\nDiscovering DAML codegen packages in damljs/\n'))

    const packages = discoverPackages()

    if (packages.length === 0) {
        console.error(error('No DAML codegen packages found with daml.yaml'))
        process.exit(1)
    }

    console.log(info(`Found ${packages.length} package(s) to generate\n`))

    // Install DPM once for all subsequent builds
    await installDPM()

    let successCount = 0
    const failedPackages: string[] = []

    for (let i = 0; i < packages.length; i++) {
        try {
            await generatePackage(packages[i], i + 1, packages.length)
            successCount++
        } catch (err) {
            const packageName = path.basename(packages[i])
            failedPackages.push(packageName)
            console.error(`Failed to generate ${packageName}: ${err}`)
        }
    }

    console.log(
        info(
            `\nGeneration complete: ${successCount}/${packages.length} succeeded`
        )
    )

    if (failedPackages.length > 0) {
        console.error(error(`Failed packages: ${failedPackages.join(', ')}`))
        process.exit(1)
    }
}

main().catch((err) => {
    console.error(`Generation failed: ${err}`)
    process.exit(1)
})
