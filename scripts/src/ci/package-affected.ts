// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { appendFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { Command } from '@commander-js/extra-typings'

type ConditionallyAffectedResult = {
    affected: boolean
    matched: string[]
    matchedFiles: string[]
}

/**
 * Checks if a package or its dependencies/files are affected.
 */
export function checkPackageOrDepsAffected(
    packageName: string,
    additionalDependencies: string[],
    affectedProjects: string[],
    additionalFiles: string[],
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
}

type CliOptions = {
    package: string
    additionalDependencies: string
    additionalFiles: string
    base: string
    head: string
    output: string
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
        .parse(argv, { from: 'user' })

    const options = program.opts() as CliOptions

    return {
        packageName: options.package,
        additionalDependencies: parseCsvList(options.additionalDependencies),
        additionalFiles: parseCsvList(options.additionalFiles),
        base: options.base,
        head: options.head,
        outputPath: options.output,
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
 *   --output "$GITHUB_OUTPUT"
 *
 * You’ll see:
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
 *   --output "/tmp/package-affected.out"
 */
function main(): void {
    const {
        packageName,
        additionalDependencies,
        additionalFiles,
        base,
        head,
        outputPath,
    } = parseArgs(process.argv.slice(2))

    const affectedProjects = getAffectedProjects(base, head)
    const changedFiles = getChangedFiles(base, head)
    const { affected, matched, matchedFiles } = checkPackageOrDepsAffected(
        packageName,
        additionalDependencies,
        affectedProjects,
        additionalFiles,
        changedFiles
    )

    appendFileSync(outputPath, `affected=${affected ? 'true' : 'false'}\n`)
    appendFileSync(outputPath, `matched_projects=${matched.join(',')}\n`)
    appendFileSync(outputPath, `matched_files=${matchedFiles.join(',')}\n`)
}

main()
