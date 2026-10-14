// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Finds the cf-docs commit the two sides were last in sync at: the base of the
// three-way merge. Nothing is stored in tracked content, the base is looked up:
//   1. a `Docs-Sync-Base: canton-network/cf-docs@<sha>` trailer in the commit
//      messages of this repository (newest commit reachable from HEAD), and
//   2. the merge commit of the newest merged sync PR in cf-docs (head branch
//      `docs-sync/...`), found with gh. cf-docs squashes with the PR title only,
//      so a trailer there would not survive.
// The newer of the two (in the cf-docs history) wins.

import { execFileSync } from 'node:child_process'

export type Base = { sha: string; source: string }

export const BRANCH_PREFIX = 'docs-sync/'

export function run(cwd: string, cmd: string, args: string[]): string {
    return execFileSync(cmd, args, {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 256 * 1024 * 1024,
    })
}

export function git(cwd: string, ...args: string[]): string {
    return run(cwd, 'git', args)
}

const hasCommit = (cfDocsDir: string, sha: string): boolean => {
    try {
        git(cfDocsDir, 'cat-file', '-e', `${sha}^{commit}`)
        return true
    } catch {
        return false
    }
}

const isAncestor = (cfDocsDir: string, a: string, b: string): boolean => {
    try {
        git(cfDocsDir, 'merge-base', '--is-ancestor', a, b)
        return true
    } catch {
        return false
    }
}

export function baseFromTrailers(
    walletDir: string,
    cfSlug: string
): string | undefined {
    const trailer = `^Docs-Sync-Base: ${cfSlug}@([0-9a-f]{40})`
    const message = git(
        walletDir,
        'log',
        '-1',
        '--format=%B',
        '-E',
        `--grep=${trailer}`
    )
    return message.match(new RegExp(trailer, 'm'))?.[1]
}

export function baseFromMergedPrs(
    walletDir: string,
    cfSlug: string,
    warn: (message: string) => void
): string | undefined {
    try {
        // filtered here: the PRs come from forks, and the head: search
        // qualifier only matches whole branch names
        const json = run(walletDir, 'gh', [
            'pr',
            'list',
            '--repo',
            cfSlug,
            '--state',
            'merged',
            '--json',
            'headRefName,mergeCommit,mergedAt',
            '--limit',
            '200',
        ])
        const prs = (
            JSON.parse(json) as {
                headRefName: string
                mergeCommit?: { oid: string }
                mergedAt: string
            }[]
        )
            .filter((pr) => pr.headRefName.startsWith(BRANCH_PREFIX))
            .sort((a, b) => b.mergedAt.localeCompare(a.mergedAt))
        return prs[0]?.mergeCommit?.oid
    } catch (e) {
        warn(
            `could not list merged sync PRs of ${cfSlug} with gh: ${String(e).split('\n')[0]}`
        )
        return undefined
    }
}

export function findBase(opts: {
    walletDir: string
    cfDocsDir: string
    cfSlug: string
    override?: string | undefined
    warn: (message: string) => void
}): Base {
    const { walletDir, cfDocsDir, cfSlug, override, warn } = opts
    if (override) return { sha: override, source: '--base' }
    const candidates: Base[] = []
    const trailer = baseFromTrailers(walletDir, cfSlug)
    if (trailer) candidates.push({ sha: trailer, source: 'commit trailer' })
    const pr = baseFromMergedPrs(walletDir, cfSlug, warn)
    if (pr) candidates.push({ sha: pr, source: 'merged sync PR' })
    const known = candidates.filter((c) => {
        if (hasCommit(cfDocsDir, c.sha)) return true
        warn(
            `${c.source} points at ${c.sha}, which is not in ${cfDocsDir} (fetch it)`
        )
        return false
    })
    const newest = known.reduce<Base | undefined>(
        (a, b) =>
            a === undefined || isAncestor(cfDocsDir, a.sha, b.sha) ? b : a,
        undefined
    )
    if (!newest) {
        throw new Error(
            `no sync base found: add a "Docs-Sync-Base: ${cfSlug}@<sha>" trailer to a commit or pass --base`
        )
    }
    return newest
}
