// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { appendFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

type ConditionalTestGateResult = {
    runTests: boolean
    matched: string[]
    matchedFiles: string[]
}

/**
 * Detect if tests should run based on affected projects.
 */
export function shouldRunTestsForAffectedProjects(
    packageName: string,
    additionalDependencies: string[],
    affectedProjects: string[],
    additionalFiles: string[],
    changedFiles: string[]
): ConditionalTestGateResult {
    const affected = new Set(affectedProjects)
    const watched = [packageName, ...additionalDependencies]
    const matched = watched.filter((project) => affected.has(project))
    const matchedFiles = findMatchingFiles(additionalFiles, changedFiles)

    return {
        runTests: matched.length > 0 || matchedFiles.length > 0,
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

function parseArgs(argv: string[]): CliArgs {
    const args = new Map<string, string>()
    for (let i = 0; i < argv.length; i += 1) {
        const key = argv[i]
        if (!key?.startsWith('--')) {
            continue
        }

        if (key.includes('=')) {
            const [rawName, ...rawValueParts] = key.slice(2).split('=')
            args.set(rawName, rawValueParts.join('='))
            continue
        }

        const value = argv[i + 1]
        if (value === undefined || value.startsWith('--')) {
            throw new Error(`Missing value for argument: ${key}`)
        }
        args.set(key.slice(2), value)
        i += 1
    }

    const packageName = args.get('package')
    const base = args.get('base')
    const head = args.get('head')
    const outputPath = args.get('output')
    const additionalDependenciesRaw = args.get('additionalDependencies') ?? ''
    const additionalFilesRaw = args.get('additionalFiles') ?? ''

    if (!packageName || !base || !head || !outputPath) {
        throw new Error(
            'Usage: yarn tsx scripts/src/ci/conditional-test-gate.ts --package <name> --additionalDependencies <comma-separated> --additionalFiles <comma-separated paths> --base <ref> --head <ref> --output <path>'
        )
    }

    const additionalDependencies = additionalDependenciesRaw
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)

    const additionalFiles = additionalFilesRaw
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)

    return {
        packageName,
        additionalDependencies,
        additionalFiles,
        base,
        head,
        outputPath,
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
 * yarn tsx ./scripts/src/ci/conditional-test-gate.ts \
 *   --package "@canton-network/example-ping" \
 *   --additionalDependencies "@canton-network/wallet-gateway-remote" \
 *   --additionalFiles ".github/workflows/build.yml,scripts/src/ci" \
 *   --base "origin/main" \
 *   --head "HEAD" \
 *   --output "$GITHUB_OUTPUT"
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
    const { runTests, matched, matchedFiles } =
        shouldRunTestsForAffectedProjects(
            packageName,
            additionalDependencies,
            affectedProjects,
            additionalFiles,
            changedFiles
        )

    appendFileSync(outputPath, `run_tests=${runTests ? 'true' : 'false'}\n`)
    appendFileSync(outputPath, `matched_projects=${matched.join(',')}\n`)
    appendFileSync(outputPath, `matched_files=${matchedFiles.join(',')}\n`)
}

main()
