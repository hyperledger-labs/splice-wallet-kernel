// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { appendFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { Command } from '@commander-js/extra-typings'

type ConditionallyAffectedResult = {
    affected: boolean
    matched: string[]
    matchedFiles: string[]
}

type CacheEntry = {
    packageName: string
    head: string
    changedFilesHash: string
    result: ConditionallyAffectedResult
    timestamp: number
}

/**
 * Checks if a package or its dependencies/files are affected.
 */
export function checkPackageOrDepsAffected(
    packageName: string,
    additionalDependencies: string[],
    additionalFiles: string[],
    affectedProjects: string[],
    changedFiles: string[]
): ConditionallyAffectedResult {
    const affectedProjectsSet = new Set(affectedProjects)
    const watchedProjects = [packageName, ...additionalDependencies]
    const matched = watchedProjects.filter((project) =>
        affectedProjectsSet.has(project)
    )
    const matchedFiles = findMatchingFiles(additionalFiles, changedFiles)

    return {
        affected: matched.length > 0 || matchedFiles.length > 0,
        matched,
        matchedFiles,
    }
}

type CliArgs = {
    packageName: string
    additionalDependencies: string[]
    additionalFiles: string[]
    base: string
    head: string
    outputPath: string
    cacheDir: string | undefined
}

type CliOptions = {
    package: string
    additionalDependencies: string
    additionalFiles: string
    base: string
    head: string
    output: string
    cacheDir: string | undefined
}

function parseCsvList(value: string): string[] {
    return value
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
}

function parseArgs(argv: string[]): CliArgs {
    const program = new Command()

    program
        .name('package-affected')
        .description(
            'Determine whether a package is affected by changes between base and head, including recursive dependencies via the Nx affected graph and explicitly stated dependencies/files.'
        )
        .requiredOption(
            '--package <packageName>',
            'Primary project/package to watch'
        )
        .requiredOption('--base <ref>', 'Git base ref')
        .requiredOption('--head <ref>', 'Git head ref')
        .requiredOption('--output <path>', 'GitHub output file path')
        .option(
            '--additionalDependencies <dependencies>',
            'Comma-separated additional projects/packages to watch',
            ''
        )
        .option(
            '--additionalFiles <files>',
            'Comma-separated files/directories to watch',
            ''
        )
        .option(
            '--cacheDir <path>',
            'Directory to store cache files for previous run results'
        )
        .parse(argv, { from: 'user' })

    const options = program.opts() as CliOptions

    return {
        packageName: options.package,
        additionalDependencies: parseCsvList(options.additionalDependencies),
        additionalFiles: parseCsvList(options.additionalFiles),
        base: options.base,
        head: options.head,
        outputPath: options.output,
        cacheDir: options.cacheDir,
    }
}

function getAffectedProjects(base: string, head: string): string[] {
    const output = execFileSync(
        'yarn',
        [
            'nx',
            'show',
            'projects',
            '--affected',
            `--base=${base}`,
            `--head=${head}`,
            '--json',
        ],
        { encoding: 'utf8' }
    )
    return JSON.parse(output) as string[]
}

function getChangedFiles(base: string, head: string): string[] {
    const output = execFileSync(
        'git',
        ['diff', '--name-only', `${base}...${head}`],
        { encoding: 'utf8' }
    )
    return output
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
}

function normalizePath(pathValue: string): string {
    return pathValue.replace(/^[.][/]/, '').replace(/\/+$/, '')
}
function hashChangedFiles(changedFiles: string[]): string {
    const sorted = changedFiles.slice().sort()
    return createHash('sha256').update(JSON.stringify(sorted)).digest('hex')
}

function getCacheFilePath(cacheDir: string, packageName: string): string {
    // Use a sanitized package name for the cache file
    const safeName = packageName.replace(/[@/]/g, '_')
    return join(cacheDir, `${safeName}.json`)
}

function tryLoadCache(
    cacheDir: string | undefined,
    packageName: string,
    head: string,
    changedFilesHash: string
): ConditionallyAffectedResult | null {
    if (!cacheDir) {
        return null
    }

    try {
        const cacheFile = getCacheFilePath(cacheDir, packageName)
        const content = readFileSync(cacheFile, 'utf8')
        const cache = JSON.parse(content) as CacheEntry

        // Only use cache if it's for the same head and changed files
        if (
            cache.head === head &&
            cache.changedFilesHash === changedFilesHash
        ) {
            return cache.result
        }
    } catch {
        // Cache file doesn't exist or is invalid, continue with normal flow
    }

    return null
}

function saveCache(
    cacheDir: string | undefined,
    packageName: string,
    head: string,
    changedFilesHash: string,
    result: ConditionallyAffectedResult
): void {
    if (!cacheDir) {
        return
    }

    try {
        mkdirSync(cacheDir, { recursive: true })
        const cacheFile = getCacheFilePath(cacheDir, packageName)
        const cache: CacheEntry = {
            packageName,
            head,
            changedFilesHash,
            result,
            timestamp: Date.now(),
        }
        writeFileSync(cacheFile, JSON.stringify(cache, null, 2))
    } catch {
        // Silently fail cache writes to avoid breaking the main script
    }
}
function findMatchingFiles(
    watchedFiles: string[],
    changedFiles: string[]
): string[] {
    if (watchedFiles.length === 0 || changedFiles.length === 0) {
        return []
    }

    const uniqueMatches = new Set<string>()
    const normalizedWatched = watchedFiles.map(normalizePath)

    for (const changedFile of changedFiles) {
        const normalizedChangedFile = normalizePath(changedFile)
        for (const watchedFile of normalizedWatched) {
            const isMatch =
                normalizedChangedFile === watchedFile ||
                normalizedChangedFile.startsWith(`${watchedFile}/`)
            if (isMatch) {
                uniqueMatches.add(watchedFile)
            }
        }
    }

    return Array.from(uniqueMatches)
}

/**
 * Example usage:
 *
 * yarn tsx ./scripts/src/ci/package-affected.ts \
 *   --package "@canton-network/example-ping" \
 *   --additionalDependencies "@canton-network/wallet-gateway-remote" \
 *   --additionalFiles ".github/workflows/build.yml,scripts/src/ci" \
 *   --base "origin/main" \
 *   --head "HEAD" \
 *   --output "$GITHUB_OUTPUT" \
 *   --cacheDir "/tmp/package-affected-cache"
 *
 * You'll see:
 * - affected=true|false
 * - matched_projects=...
 * - matched_files=...
 *
 * For quick local testing without remote refs:
 *
 * yarn tsx ./scripts/src/ci/package-affected.ts \
 *   --package "@canton-network/example-ping" \
 *   --additionalDependencies "@canton-network/wallet-gateway-remote" \
 *   --additionalFiles "scripts/src/lib/version-config.json" \
 *   --base "HEAD~1" \
 *   --head "HEAD" \
 *   --output "/tmp/package-affected.out" \
 *   --cacheDir "/tmp/package-affected-cache"
 */
function main(): void {
    const {
        packageName,
        additionalDependencies,
        additionalFiles,
        base,
        head,
        outputPath,
        cacheDir,
    } = parseArgs(process.argv.slice(2))

    const changedFiles = getChangedFiles(base, head)
    const changedFilesHash = hashChangedFiles(changedFiles)

    // Check if we have a cached result that still applies
    const cachedResult = tryLoadCache(
        cacheDir,
        packageName,
        head,
        changedFilesHash
    )
    if (cachedResult) {
        appendFileSync(
            outputPath,
            `affected=${cachedResult.affected ? 'true' : 'false'}\n`
        )
        appendFileSync(
            outputPath,
            `matched_projects=${cachedResult.matched.join(',')}\n`
        )
        appendFileSync(
            outputPath,
            `matched_files=${cachedResult.matchedFiles.join(',')}\n`
        )
        return
    }

    const affectedProjects = getAffectedProjects(base, head)
    const { affected, matched, matchedFiles } = checkPackageOrDepsAffected(
        packageName,
        additionalDependencies,
        additionalFiles,
        affectedProjects,
        changedFiles
    )

    // Save the result to cache for next time
    const result = { affected, matched, matchedFiles }
    saveCache(cacheDir, packageName, head, changedFilesHash, result)

    appendFileSync(outputPath, `affected=${affected ? 'true' : 'false'}\n`)
    appendFileSync(outputPath, `matched_projects=${matched.join(',')}\n`)
    appendFileSync(outputPath, `matched_files=${matchedFiles.join(',')}\n`)
}

main()
