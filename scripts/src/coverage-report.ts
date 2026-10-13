// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { execSync } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getArgValue, getRepoRoot } from './lib/utils.js'

interface CoverageMetric {
    total: number
    covered: number
    pct: number
}

interface CoverageSummary {
    total: {
        lines: CoverageMetric
    }
}

interface NxGraph {
    graph: { nodes: Record<string, { data: { root: string } }> }
}

type CoverageResult =
    | {
          status: 'measured'
          linesPct: number
          linesTotal: number
          linesCovered: number
      }
    | { status: 'missing' }

interface PackageCoverage {
    name: string
    result: CoverageResult
}

const repoRoot = getRepoRoot()
const base = getArgValue('base')
const head = getArgValue('head')

function nxJson(command: string): unknown {
    const stdout = execSync(`pnpm ${command}`, {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'inherit'],
    })
    return JSON.parse(stdout)
}

function getProjects(): string[] {
    let command = 'nx show projects --with-target=test --json'
    if (base && head) {
        command += ` --affected --base=${base} --head=${head}`
    }
    return nxJson(command) as string[]
}

function getProjectRoots(): Map<string, string> {
    const { graph } = nxJson('nx graph --print') as NxGraph
    return new Map(
        Object.entries(graph.nodes).map(([name, node]) => [
            name,
            node.data.root,
        ])
    )
}

function readLineCoverage(projectRoot: string): CoverageResult {
    const summaryPath = join(
        repoRoot,
        projectRoot,
        'coverage',
        'coverage-summary.json'
    )
    if (!existsSync(summaryPath)) {
        return { status: 'missing' }
    }

    const summary = JSON.parse(
        readFileSync(summaryPath, 'utf8')
    ) as CoverageSummary
    const lines = summary.total.lines
    return {
        status: 'measured',
        linesPct: lines.pct,
        linesTotal: lines.total,
        linesCovered: lines.covered,
    }
}

function formatCoverage(result: CoverageResult): string {
    switch (result.status) {
        case 'measured':
            return `${result.linesPct.toFixed(2)}%`
        case 'missing':
            return 'No coverage info'
    }
}

function getTotalPct(entries: PackageCoverage[]): number | undefined {
    const measured = entries.flatMap((entry) =>
        entry.result.status === 'measured' ? [entry.result] : []
    )
    if (measured.length === 0) {
        return undefined
    }
    const totalLines = measured.reduce(
        (sum, result) => sum + result.linesTotal,
        0
    )
    const coveredLines = measured.reduce(
        (sum, result) => sum + result.linesCovered,
        0
    )
    return totalLines > 0 ? (coveredLines / totalLines) * 100 : 0
}

function printReport(entries: PackageCoverage[]): void {
    const nameWidth = Math.max(
        7,
        ...entries.map((entry) => entry.name.length),
        'Package'.length
    )
    const coverageWidth = Math.max('Coverage'.length, 8)
    const divider = '-'.repeat(nameWidth + coverageWidth + 3)

    console.log('')
    console.log('Unit test coverage summary')
    console.log(divider)
    console.log(
        `${'Package'.padEnd(nameWidth)} | ${'Coverage'.padStart(coverageWidth)}`
    )
    console.log(divider)

    for (const entry of entries) {
        console.log(
            `${entry.name.padEnd(nameWidth)} | ${formatCoverage(entry.result).padStart(coverageWidth)}`
        )
    }

    const totalPct = getTotalPct(entries)
    if (totalPct !== undefined) {
        console.log(divider)
        console.log(
            `${'Total'.padEnd(nameWidth)} | ${`${totalPct.toFixed(2)}%`.padStart(coverageWidth)}`
        )
    }

    console.log(divider)
    console.log('')
}

function writeGitHubStepSummary(entries: PackageCoverage[]): void {
    const summaryFile = process.env.GITHUB_STEP_SUMMARY
    if (!summaryFile) {
        return
    }

    const totalPct = getTotalPct(entries)
    const lines = [
        '## Unit test coverage summary',
        '',
        '| Package | Line coverage |',
        '| --- | ---: |',
        ...entries.map(
            (entry) => `| ${entry.name} | ${formatCoverage(entry.result)} |`
        ),
        ...(totalPct !== undefined
            ? [`| **Total** | **${totalPct.toFixed(2)}%** |`]
            : []),
        '',
    ]
    appendFileSync(summaryFile, lines.join('\n'))
}

const projects = getProjects()
if (projects.length === 0) {
    console.log('No packages with test target to report.')
    process.exit(0)
}

const projectRoots = getProjectRoots()
const entries: PackageCoverage[] = projects
    .map((name) => ({
        name,
        result: readLineCoverage(projectRoots.get(name) ?? ''),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

const missing = entries.filter((entry) => entry.result.status === 'missing')
if (missing.length > 0) {
    console.warn(
        `Coverage summary missing for ${missing.length} package(s): ${missing.map((entry) => entry.name).join(', ')}`
    )
}

printReport(entries)
writeGitHubStepSummary(entries)
