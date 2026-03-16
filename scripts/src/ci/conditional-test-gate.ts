// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { appendFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

type ConditionalTestGateResult = {
    runTests: boolean
    matched: string[]
}

/**
 * Detect if tests should run based on affected projects.
 */
export function shouldRunTestsForAffectedProjects(
    packageName: string,
    additionalDependencies: string[],
    affectedProjects: string[]
): ConditionalTestGateResult {
    const affected = new Set(affectedProjects)
    const watched = [packageName, ...additionalDependencies]
    const matched = watched.filter((project) => affected.has(project))

    return {
        runTests: matched.length > 0,
        matched,
    }
}

type CliArgs = {
    packageName: string
    additionalDependencies: string[]
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

    if (!packageName || !base || !head || !outputPath) {
        throw new Error(
            'Usage: yarn tsx scripts/src/ci/conditional-test-gate.ts --package <name> --additionalDependencies <comma-separated> --base <ref> --head <ref> --output <path>'
        )
    }

    const additionalDependencies = additionalDependenciesRaw
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)

    return { packageName, additionalDependencies, base, head, outputPath }
}

function getAffectedProjects(base: string, head: string): string[] {
    const output = execSync(
        `yarn nx show projects --affected --base=${base} --head=${head} --json`,
        {
            encoding: 'utf8',
        }
    )
    return JSON.parse(output) as string[]
}

function main(): void {
    const { packageName, additionalDependencies, base, head, outputPath } =
        parseArgs(process.argv.slice(2))
    const affectedProjects = getAffectedProjects(base, head)
    const { runTests, matched } = shouldRunTestsForAffectedProjects(
        packageName,
        additionalDependencies,
        affectedProjects
    )

    appendFileSync(outputPath, `run_tests=${runTests ? 'true' : 'false'}\n`)
    appendFileSync(outputPath, `matched_projects=${matched.join(',')}\n`)
}

main()
