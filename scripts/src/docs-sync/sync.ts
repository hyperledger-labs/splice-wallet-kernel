// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Two-way sync of the docs between this repository (docs/) and the central
// docs repository (cf-docs, Mintlify). Run by hand, it needs a checkout of
// cf-docs, git and the gh cli (logged in). It does not need write access to
// the repository the PR is for: the branch is pushed to a fork of it (created
// with gh when missing, or the remote given with --push-remote) and the PR is
// opened across forks.
//
//   tsx scripts/src/docs-sync/sync.ts to-cf   --cf-docs ../cf-docs [--no-dry-run]
//   tsx scripts/src/docs-sync/sync.ts from-cf --cf-docs ../cf-docs [--no-dry-run]
//
// Every page in docs/docs-sync.json is merged three-way: base = the cf-docs
// commit of the last sync (see base.ts), ours = this repository, theirs = the
// current cf-docs. The result goes to a branch and a draft PR on the target
// side. Conflicts are committed as conflict markers. Pages nothing changed on
// are not touched. By default it only prints what would change, --no-dry-run
// creates the branch and the PR.

import { Command } from '@commander-js/extra-typings'
import { createTwoFilesPatch } from 'diff'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
    buildLinkMap,
    buildReverseLinkMap,
    loadManifest,
    repoSlug,
    sitePathOf,
} from '../lib/docs-sync.js'
import { getRepoRoot } from '../lib/utils.js'
import { BRANCH_PREFIX, findBase, git, run } from './base.js'
import {
    mergeFromCf,
    mergeToCf,
    type PageContext,
    type PageResult,
} from './merge.js'

type Direction = 'to-cf' | 'from-cf'

type Options = {
    cfDocs: string
    cfRef: string
    base?: string
    dryRun: boolean
    showDiff?: boolean
    fetch: boolean
    allowDirty?: boolean
    pushRemote?: string | undefined
}

type PageOutcome = {
    walletFile: string
    cfFile: string
    result: PageResult
    // what the target side has now, for --show-diff
    current: string
}

const FORK_REMOTE = 'docs-sync-fork'

// Where the branch goes. Write access to the target repository is not assumed:
// a fork of it, created with gh when it does not exist yet.
function resolvePushTarget(
    dir: string,
    slug: string,
    pushRemote: string | undefined
): { remote: string; owner: string } {
    if (pushRemote) {
        const url = git(dir, 'remote', 'get-url', pushRemote).trim()
        return {
            remote: pushRemote,
            owner: repoSlug(url).split('/')[0] as string,
        }
    }
    const login = run(dir, 'gh', ['api', 'user', '--jq', '.login']).trim()
    const name = slug.split('/')[1] as string
    try {
        run(dir, 'gh', ['repo', 'fork', slug, '--clone=false'])
    } catch (e) {
        // already forked is fine, anything else shows up when pushing
        try {
            run(dir, 'gh', ['repo', 'view', `${login}/${name}`])
        } catch {
            throw e
        }
    }
    const remotes = git(dir, 'remote').split('\n')
    git(
        dir,
        'remote',
        remotes.includes(FORK_REMOTE) ? 'set-url' : 'add',
        FORK_REMOTE,
        `https://github.com/${login}/${name}.git`
    )
    return { remote: FORK_REMOTE, owner: login }
}

const gitShow = (dir: string, sha: string, file: string) => {
    try {
        return git(dir, 'show', `${sha}:${file}`)
    } catch {
        return undefined
    }
}

const dirty = (dir: string, ...paths: string[]): boolean =>
    git(
        dir,
        'status',
        '--porcelain',
        ...(paths.length ? ['--', ...paths] : [])
    ).trim().length > 0

const write = (root: string, file: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
    fs.writeFileSync(path.join(root, file), text)
}

const ICONS: Record<PageResult['status'], string> = {
    unchanged: '=',
    new: '+',
    replaces: '~',
    changed: 'M',
    conflict: '!',
}

// images a converted page refers to that the target side does not have
function missingImages(
    direction: Direction,
    outcome: PageOutcome,
    repoRoot: string,
    cfDocs: string,
    cfSha: string
): string[] {
    if (outcome.result.status === 'unchanged') return []
    const text = outcome.result.text
    const missing: string[] = []
    if (direction === 'to-cf') {
        for (const m of text.matchAll(
            /(?:!\[[^\]]*\]\(|src=")(\/[^)"\s]+\.(?:png|jpe?g|gif|svg|webp))/g
        )) {
            const file = `docs-main${m[1]}`
            if (gitShow(cfDocs, cfSha, file) === undefined) missing.push(file)
        }
    } else {
        for (const m of text.matchAll(
            /!\[[^\]]*\]\(([^)\s/][^)\s]*\.(?:png|jpe?g|gif|svg|webp))\)/g
        )) {
            const file = path.posix.join(
                path.posix.dirname(outcome.walletFile),
                m[1] as string
            )
            if (!fs.existsSync(path.join(repoRoot, file))) missing.push(file)
        }
    }
    return [...new Set(missing)]
}

function buildBody(
    direction: Direction,
    outcomes: PageOutcome[],
    checklist: string[],
    info: {
        walletSha: string
        cfSha: string
        baseSha: string
        baseSource: string
    }
): string {
    const pages = outcomes.filter((o) => o.result.status !== 'unchanged')
    const list = (status: PageResult['status'], title: string) => {
        const items = pages.filter((o) => o.result.status === status)
        return items.length
            ? [
                  `**${title}**`,
                  ...items.map(
                      (o) =>
                          `- \`${direction === 'to-cf' ? o.cfFile : o.walletFile}\``
                  ),
                  '',
              ]
            : []
    }
    return [
        direction === 'to-cf'
            ? `Docs synced from canton-network/wallet@${info.walletSha} (\`docs/\`), merged three-way against the cf-docs base ${info.baseSha.slice(0, 8)} (${info.baseSource}) and cf-docs@${info.cfSha.slice(0, 8)}.`
            : `Docs synced from canton-network/cf-docs@${info.cfSha.slice(0, 8)}, merged three-way against the cf-docs base ${info.baseSha.slice(0, 8)} (${info.baseSource}).`,
        '',
        ...list('conflict', 'Conflicts (resolve the markers)'),
        ...list('changed', 'Updated pages'),
        ...list('new', 'New pages'),
        ...list('replaces', 'Pages that replace an existing page'),
        '### Needs a human',
        '',
        ...(checklist.length ? checklist : ['- [ ] Nothing flagged']),
        '',
        direction === 'to-cf'
            ? '- [ ] Run `mint validate` and check the preview'
            : '- [ ] Keep the `Docs-Sync-Base` trailer of the commit in the squash message',
        '',
        '_Created by `scripts/src/docs-sync/sync.ts`._',
    ].join('\n')
}

async function sync(direction: Direction, opts: Options) {
    const repoRoot = getRepoRoot()
    const manifest = loadManifest()
    const cfSlug = repoSlug(manifest.remote)
    const walletSlug = repoSlug(
        git(repoRoot, 'remote', 'get-url', 'origin').trim()
    )
    const cfDocs = path.resolve(opts.cfDocs)
    if (!fs.existsSync(path.join(cfDocs, '.git')))
        throw new Error(`${cfDocs} is not a checkout of ${cfSlug}`)
    const warnings: string[] = []
    const warn = (message: string) => warnings.push(message)

    if (opts.fetch) git(cfDocs, 'fetch', '--quiet', 'origin')
    const cfSha = git(cfDocs, 'rev-parse', opts.cfRef).trim()
    const walletSha = git(repoRoot, 'rev-parse', 'HEAD').trim()
    const base = findBase({
        walletDir: repoRoot,
        cfDocsDir: cfDocs,
        cfSlug,
        override: opts.base,
        warn,
    })
    console.log(
        `${direction}: base ${base.sha.slice(0, 8)} (${base.source}), cf-docs ${opts.cfRef} ${cfSha.slice(0, 8)}, wallet ${walletSha.slice(0, 8)}`
    )
    if (!opts.dryRun && direction === 'to-cf' && !opts.allowDirty) {
        if (dirty(repoRoot, 'docs'))
            throw new Error(
                'docs/ has uncommitted changes, commit them first (or --allow-dirty)'
            )
    }

    const linkMap = buildLinkMap(manifest)
    const reverseLinkMap = buildReverseLinkMap(manifest)
    const outcomes: PageOutcome[] = []
    for (const page of manifest.pages) {
        const ctx: PageContext = {
            walletFile: page.wallet,
            cfFile: page.cf,
            manifest,
            linkMap,
            reverseLinkMap,
            repoRoot,
            warn,
        }
        const walletMd = fs.readFileSync(
            path.join(repoRoot, page.wallet),
            'utf8'
        )
        const baseMdx = gitShow(cfDocs, base.sha, page.cf)
        const theirsMdx = gitShow(cfDocs, cfSha, page.cf)
        let result: PageResult
        let current: string
        if (direction === 'to-cf') {
            result = await mergeToCf(walletMd, baseMdx, theirsMdx, ctx)
            current = theirsMdx ?? ''
        } else if (theirsMdx === undefined) {
            warn(`${page.cf} does not exist in cf-docs, skipped`)
            continue
        } else {
            result = await mergeFromCf(walletMd, baseMdx, theirsMdx, ctx)
            current = walletMd
        }
        outcomes.push({
            walletFile: page.wallet,
            cfFile: page.cf,
            result,
            current,
        })
    }

    // what a human has to do
    const checklist: string[] = []
    const docsJson = gitShow(cfDocs, cfSha, 'docs-main/docs.json') ?? ''
    for (const o of outcomes) {
        const { status } = o.result
        if (status === 'unchanged') continue
        const target = direction === 'to-cf' ? o.cfFile : o.walletFile
        if (status === 'conflict')
            checklist.push(
                `- [ ] Resolve the ${(o.result as { conflicts: number }).conflicts} conflict(s) in \`${target}\``
            )
        if (
            direction === 'to-cf' &&
            (status === 'new' || status === 'replaces') &&
            !docsJson.includes(`"${sitePathOf(o.cfFile).slice(1)}"`)
        )
            checklist.push(
                `- [ ] Add a navigation entry for \`${sitePathOf(o.cfFile)}\` to \`docs-main/docs.json\``
            )
        if (status === 'replaces')
            checklist.push(
                `- [ ] \`${target}\` replaces an existing page: check that nothing is lost, add redirects if the path changes`
            )
        for (const image of missingImages(
            direction,
            o,
            repoRoot,
            cfDocs,
            cfSha
        ))
            checklist.push(
                `- [ ] Image \`${image}\` is missing on the target side (referenced by \`${target}\`)`
            )
    }

    for (const o of outcomes)
        console.log(
            ` ${ICONS[o.result.status]} ${direction === 'to-cf' ? o.cfFile : o.walletFile}`
        )
    for (const w of new Set(warnings)) console.warn(`warning: ${w}`)
    const changed = outcomes.filter((o) => o.result.status !== 'unchanged')
    if (changed.length === 0) {
        console.log('Nothing to sync.')
        return
    }
    if (opts.showDiff)
        for (const o of changed) {
            const r = o.result as Exclude<PageResult, { status: 'unchanged' }>
            process.stdout.write(
                createTwoFilesPatch(
                    `current/${o.cfFile}`,
                    `synced/${o.cfFile}`,
                    o.current,
                    r.text
                )
            )
        }

    const body = buildBody(direction, outcomes, checklist, {
        walletSha,
        cfSha,
        baseSha: base.sha,
        baseSource: base.source,
    })
    const title =
        direction === 'to-cf'
            ? `Sync docs from canton-network/wallet (${changed.length} pages)`
            : `docs: sync ${changed.length} pages from cf-docs`
    if (opts.dryRun) {
        console.log(
            `\nDry run (pass --no-dry-run to create it): would push the branch to your fork and open a draft PR: ${title}\n\n${body}`
        )
        return
    }

    // --- apply on the target side and open the draft PR
    const targetDir = direction === 'to-cf' ? cfDocs : repoRoot
    const targetSlug = direction === 'to-cf' ? cfSlug : walletSlug
    if (dirty(targetDir))
        throw new Error(`${targetDir} has uncommitted changes`)
    const branch =
        direction === 'to-cf'
            ? `${BRANCH_PREFIX}wallet-${walletSha.slice(0, 8)}`
            : `${BRANCH_PREFIX}cf-docs-${cfSha.slice(0, 8)}`
    // before anything is changed: this is what needs gh and the network
    const target = resolvePushTarget(targetDir, targetSlug, opts.pushRemote)
    git(
        targetDir,
        'switch',
        '-c',
        branch,
        ...(direction === 'to-cf' ? [cfSha] : [])
    )
    for (const o of changed)
        write(
            targetDir,
            direction === 'to-cf' ? o.cfFile : o.walletFile,
            (o.result as { text: string }).text
        )
    git(targetDir, 'add', '-A')
    // the base moves only when this PR is merged: trailer here, PR lookup for cf-docs
    const trailer =
        direction === 'from-cf' ? `\n\nDocs-Sync-Base: ${cfSlug}@${cfSha}` : ''
    git(targetDir, 'commit', '--quiet', '--signoff', '-m', `${title}${trailer}`)
    git(targetDir, 'push', '--quiet', '-u', target.remote, branch)
    const bodyFile = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'docs-sync-')),
        'body.md'
    )
    fs.writeFileSync(bodyFile, body)
    const baseBranch =
        direction === 'to-cf' ? opts.cfRef.replace(/^origin\//, '') : undefined
    const url = run(targetDir, 'gh', [
        'pr',
        'create',
        '--repo',
        targetSlug,
        '--draft',
        '--head',
        `${target.owner}:${branch}`,
        ...(baseBranch ? ['--base', baseBranch] : []),
        '--title',
        title,
        '--body-file',
        bodyFile,
    ]).trim()
    console.log(`Opened ${url}`)
}

const program = new Command()
    .name('docs-sync')
    .description(
        'Sync docs/ with cf-docs: three-way merge per page, draft PR on the target side'
    )

function define(direction: Direction, description: string) {
    program
        .command(direction)
        .description(description)
        .requiredOption(
            '--cf-docs <path>',
            'checkout of canton-network/cf-docs'
        )
        .option('--cf-ref <ref>', 'cf-docs ref to sync with', 'origin/main')
        .option(
            '--base <sha>',
            'cf-docs commit of the last sync (default: lookup)'
        )
        .option(
            '--no-dry-run',
            'create the branch and the draft PR (default: only print what would change)'
        )
        .option('--show-diff', 'print the changes as diffs')
        .option('--no-fetch', 'do not fetch cf-docs first')
        .option('--allow-dirty', 'sync docs/ with uncommitted changes')
        .option(
            '--push-remote <name>',
            'remote of the target checkout to push the branch to (default: your fork, created with gh)'
        )
        .action((opts) =>
            sync(direction, opts).catch((e: unknown) => {
                console.error(e instanceof Error ? e.message : e)
                process.exit(1)
            })
        )
}

define(
    'to-cf',
    'bring the changes of this repository to cf-docs (draft PR in cf-docs)'
)
define(
    'from-cf',
    'bring the changes of cf-docs to this repository (draft PR here)'
)
program.parse(process.argv)
