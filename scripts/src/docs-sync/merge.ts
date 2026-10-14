// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Three-way merge of one page. The three versions are brought into the same
// form first, so that formatting differences between the two repositories do
// not show up as changes: the cf-docs sides go through mdxToMd, prettier and
// (towards cf-docs) mdToMdx again.
//
//   to-cf:   ours = wallet page as mdx, base/theirs = cf-docs page normalized
//   from-cf: ours = wallet page,        base/theirs = cf-docs page as markdown
//
// A page nothing changes on is left alone (not even normalized), and one the
// wallet side did not change is not touched towards cf-docs.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import * as prettier from 'prettier'
import type { DocsSyncManifest } from '../lib/docs-sync.js'
import { mdToMdx } from './md-to-mdx.js'
import { mdxToMd } from './mdx-to-md.js'

export type PageContext = {
    walletFile: string
    cfFile: string
    manifest: DocsSyncManifest
    linkMap: Map<string, string>
    reverseLinkMap: Map<string, string>
    repoRoot: string
    warn: (message: string) => void
}

export type PageResult =
    | { status: 'unchanged' }
    | { status: 'new'; text: string }
    // the page exists in cf-docs but was not paired before
    | { status: 'replaces'; text: string }
    | { status: 'changed'; text: string }
    | { status: 'conflict'; text: string; conflicts: number }

export async function formatMarkdown(
    md: string,
    walletFile: string,
    repoRoot: string
): Promise<string> {
    const filepath = path.join(repoRoot, walletFile)
    const config = (await prettier.resolveConfig(filepath)) ?? {}
    return prettier.format(md, { ...config, filepath })
}

// markdown links to sibling pages are written with and without ./
const sameLinks = (md: string): string => md.replace(/\]\(\.\//g, '](')

// dotSlash: write sibling links as ./x.md (the page does), else x.md
function toMarkdown(
    mdx: string,
    ctx: PageContext,
    dotSlash = false
): Promise<string> {
    const md = mdxToMd(mdx, {
        linkMap: ctx.linkMap,
        fromFile: ctx.walletFile,
        cfFile: ctx.cfFile,
        siteBaseUrl: ctx.manifest.siteBaseUrl,
        warn: (m) => ctx.warn(`${ctx.walletFile}: ${m}`),
    })
    return formatMarkdown(md, ctx.walletFile, ctx.repoRoot).then((text) =>
        dotSlash ? text : sameLinks(text)
    )
}

export function toMdx(md: string, ctx: PageContext): string {
    return mdToMdx(md, {
        walletFile: ctx.walletFile,
        cfFile: ctx.cfFile,
        reverseLinkMap: ctx.reverseLinkMap,
        siteBaseUrl: ctx.manifest.siteBaseUrl,
        repoRoot: ctx.repoRoot,
        warn: (m) => ctx.warn(`${ctx.walletFile}: ${m}`),
    })
}

// the page as cf-docs would have it after a round trip
async function normalizeMdx(mdx: string, ctx: PageContext): Promise<string> {
    return toMdx(await toMarkdown(mdx, ctx), ctx)
}

export function mergeFile(
    ours: string,
    base: string,
    theirs: string,
    labels: [string, string, string]
): { text: string; conflicts: number } {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-sync-'))
    try {
        const files = [ours, base, theirs].map((content, i) => {
            const file = path.join(dir, String(i))
            fs.writeFileSync(file, content)
            return file
        })
        const r = spawnSync(
            'git',
            [
                'merge-file',
                '-p',
                '-L',
                labels[0],
                '-L',
                labels[1],
                '-L',
                labels[2],
                ...files,
            ],
            { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
        )
        if (r.status === null || r.status < 0 || r.status > 127)
            throw new Error(`git merge-file failed: ${r.stderr}`)
        return { text: r.stdout, conflicts: r.status }
    } finally {
        fs.rmSync(dir, { recursive: true, force: true })
    }
}

export async function mergeToCf(
    walletMd: string,
    baseMdx: string | undefined,
    theirsMdx: string | undefined,
    ctx: PageContext
): Promise<PageResult> {
    const ours = toMdx(walletMd, ctx)
    if (theirsMdx === undefined) return { status: 'new', text: ours }
    const theirs = await normalizeMdx(theirsMdx, ctx)
    if (ours === theirs) return { status: 'unchanged' }
    if (baseMdx === undefined) return { status: 'replaces', text: ours }
    const base = await normalizeMdx(baseMdx, ctx)
    const merged = mergeFile(ours, base, theirs, ['wallet', 'base', 'cf-docs'])
    if (merged.text === theirs) return { status: 'unchanged' }
    return merged.conflicts > 0
        ? { status: 'conflict', ...merged }
        : { status: 'changed', text: merged.text }
}

export async function mergeFromCf(
    walletMd: string,
    baseMdx: string | undefined,
    theirsMdx: string,
    ctx: PageContext
): Promise<PageResult> {
    // keep the link style of the page, it is not what cf-docs changed
    const dotSlash = /\]\(\.\//.test(walletMd)
    const theirs = await toMarkdown(theirsMdx, ctx, dotSlash)
    const ours = walletMd
    if (baseMdx === undefined) {
        // not in cf-docs at the base: nothing to merge with
        return theirs === ours
            ? { status: 'unchanged' }
            : { status: 'replaces', text: theirs }
    }
    const base = await toMarkdown(baseMdx, ctx, dotSlash)
    if (base === theirs) return { status: 'unchanged' }
    const merged = mergeFile(ours, base, theirs, ['wallet', 'base', 'cf-docs'])
    if (merged.text === ours) return { status: 'unchanged' }
    return merged.conflicts > 0
        ? { status: 'conflict', ...merged }
        : {
              status: 'changed',
              text: await formatMarkdown(
                  merged.text,
                  ctx.walletFile,
                  ctx.repoRoot
              ),
          }
}
