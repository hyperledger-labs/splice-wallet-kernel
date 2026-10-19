// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Enforces the dependency conventions of the pnpm workspace:
//  - every third party dependency is declared as `catalog:` (peer dependencies
//    may declare the range they support instead)
//  - every dependency on a workspace project uses `workspace:` (core packages)
//    or `workspace:^` (everything else) and is never part of a catalog
//  - the catalog entries in pnpm-workspace.yaml are sorted alphabetically
//
// `pnpm add` under `catalogMode: strict` puts workspace packages into the
// catalog. Run this script with --fix afterwards to turn those into workspace
// dependencies, sort the catalog and update the lockfile.

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { load } from 'js-yaml'
import { getRepoRoot } from './lib/utils.js'

const DEPENDENCY_FIELDS = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
] as const

const fix = process.argv.includes('--fix')
const root = getRepoRoot()
const workspaceFile = join(root, 'pnpm-workspace.yaml')

type Manifest = Partial<
    Record<(typeof DEPENDENCY_FIELDS)[number], Record<string, string>>
>

interface Workspace {
    catalog?: Record<string, string>
    catalogs?: Record<string, Record<string, string>>
}

interface SpecViolation {
    file: string
    where: string
    name: string
    spec: string
    expected?: string
}

const manifestFiles = execSync(
    `git ls-files --exclude-standard '*package.json'`,
    {
        cwd: root,
        encoding: 'utf8',
    }
)
    .split('\n')
    .filter(Boolean)

const workspaceNames = new Set(
    (
        JSON.parse(
            execSync('pnpm -r ls --json --depth -1', {
                cwd: root,
                encoding: 'utf8',
            })
        ) as { name: string }[]
    ).map((p) => p.name)
)

const sortedKeys = (keys: string[]) => keys.toSorted()

const isSorted = (keys: string[]) => {
    const sorted = sortedKeys(keys)
    return keys.every((key, i) => key === sorted[i])
}

const findSpecViolations = (): SpecViolation[] => {
    const violations: SpecViolation[] = []
    for (const file of manifestFiles) {
        const manifest = JSON.parse(
            readFileSync(join(root, file), 'utf8')
        ) as Manifest
        for (const field of DEPENDENCY_FIELDS) {
            for (const [name, spec] of Object.entries(manifest[field] ?? {})) {
                const where = `${file}: ${field}["${name}"]`
                if (workspaceNames.has(name)) {
                    const expected = name.startsWith('@canton-network/core-')
                        ? 'workspace:'
                        : 'workspace:^'
                    if (spec !== expected) {
                        violations.push({ file, where, name, spec, expected })
                    }
                } else if (
                    field !== 'peerDependencies' &&
                    !spec.startsWith('catalog:')
                ) {
                    violations.push({ file, where, name, spec })
                }
            }
        }
    }
    return violations
}

const readCatalogs = (): Record<string, Record<string, string>> => {
    const workspace = load(readFileSync(workspaceFile, 'utf8')) as Workspace
    return {
        default: workspace.catalog ?? {},
        ...workspace.catalogs,
    }
}

// `    '@scope/pkg': ^1.0.0` -> `@scope/pkg`
const entryKey = (line: string) =>
    line.split(':')[0].trim().replace(/['"]/g, '')

// Returns the [start, end) line range of the entries below `header`
// (e.g. `catalog:`), or undefined if there is no such block.
const blockRange = (
    lines: string[],
    header: string,
    indent: number
): [number, number] | undefined => {
    const start = lines.indexOf(header)
    if (start === -1) return undefined
    let end = start + 1
    while (
        end < lines.length &&
        lines[end].startsWith(' '.repeat(indent)) &&
        !lines[end].startsWith(' '.repeat(indent + 1))
    ) {
        end++
    }
    return [start + 1, end]
}

const catalogBlocks = (): { header: string; indent: number }[] => [
    { header: 'catalog:', indent: 4 },
    ...Object.keys(readCatalogs())
        .filter((name) => name !== 'default')
        .map((name) => ({ header: `    ${name}:`, indent: 8 })),
]

// Points the dependencies of the package.json files at the workspace.
const fixSpecs = (violations: SpecViolation[]) => {
    for (const v of violations.filter((v) => v.expected)) {
        const path = join(root, v.file)
        writeFileSync(
            path,
            readFileSync(path, 'utf8').replaceAll(
                `"${v.name}": "${v.spec}"`,
                `"${v.name}": "${v.expected}"`
            )
        )
    }
}

// Removes workspace projects from the catalogs and sorts the remaining entries.
const fixCatalog = () => {
    const lines = readFileSync(workspaceFile, 'utf8').split('\n')
    for (const { header, indent } of catalogBlocks()) {
        const range = blockRange(lines, header, indent)
        if (!range) continue
        const block = lines
            .slice(...range)
            .filter((l) => !workspaceNames.has(entryKey(l)))
        if (block.some((l) => l.trim().startsWith('#'))) {
            console.error(
                `Not sorting ${header} automatically, it has comments`
            )
            continue
        }
        const byKey = new Map(block.map((l) => [entryKey(l), l]))
        lines.splice(
            range[0],
            range[1] - range[0],
            ...sortedKeys([...byKey.keys()]).map((k) => byKey.get(k)!)
        )
    }
    writeFileSync(workspaceFile, lines.join('\n'))
}

const findCatalogErrors = (): string[] => {
    const errors: string[] = []
    for (const [catalogName, entries] of Object.entries(readCatalogs())) {
        const keys = Object.keys(entries)
        for (const key of keys.filter((k) => workspaceNames.has(k))) {
            errors.push(
                `pnpm-workspace.yaml: catalog "${catalogName}" contains workspace project "${key}", reference it with workspace: or workspace:^ instead`
            )
        }
        if (!isSorted(keys)) {
            errors.push(
                `pnpm-workspace.yaml: catalog "${catalogName}" is not sorted alphabetically`
            )
        }
    }
    return errors
}

const describe = (v: SpecViolation) =>
    v.expected
        ? `${v.where} is "${v.spec}", workspace dependencies must be "${v.expected}"`
        : `${v.where} is "${v.spec}", third party dependencies must use "catalog:"`

if (fix) {
    fixSpecs(findSpecViolations())
    fixCatalog()
    console.log(
        'Fixed workspace dependencies and sorted the catalog, updating the lockfile'
    )
    execSync('pnpm install', { cwd: root, stdio: 'inherit' })
}

const errors = [...findSpecViolations().map(describe), ...findCatalogErrors()]

if (errors.length > 0) {
    console.error(errors.join('\n'))
    console.error(
        `\n${errors.length} problem(s) found. Run "pnpm script:check-catalog --fix" to fix workspace dependencies and catalog ordering; third party dependencies must be set to "catalog:" by hand.`
    )
    process.exit(1)
}
console.log('Dependency specs and catalog entries are consistent')
