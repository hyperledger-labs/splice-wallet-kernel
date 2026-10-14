// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Converts a Mintlify .mdx page from the central docs repository (cf-docs) to
// the plain-markdown conventions used in this repository. Fenced code is never
// modified (apart from de-indenting it when it sits inside a <Tab>).
//
// Conventions for constructs plain markdown does not have:
//   <Tabs>/<Tab title="X">   -> <!-- tabs -->, <!-- tab: X --> + **X**, <!-- /tabs -->
//   <div className="before-after"> -> <!-- before-after --> ... <!-- /before-after -->
//   <Steps>/<Step title="X"> -> <!-- steps -->, ### X, <!-- /steps -->
//   <Note>                   -> > [!NOTE]
//   <CardGroup>/<Card>       -> <!-- cards cols=N --> + "- [Title](href) <!-- icon: x --> text"
//   absolute site links      -> relative .md link when the target is in this repo,
//                               otherwise an absolute https://docs.canton.network link

import { Command } from '@commander-js/extra-typings'
import fs from 'node:fs'
import path from 'node:path'
import { buildLinkMap, loadManifest } from '../lib/docs-sync.js'

type LinkContext = {
    linkMap: Map<string, string>
    fromFile: string
    siteBaseUrl: string
}

type ConvertOptions = LinkContext & {
    // the page's cf-docs path, to make image paths relative
    cfFile?: string
    warn?: (message: string) => void
}

const ALERTS: Record<string, string> = {
    Note: 'NOTE',
    Tip: 'TIP',
    Info: 'IMPORTANT',
    Warning: 'WARNING',
}

type CardState = { head: string; body: string[]; open: boolean }

function rewriteLink(
    href: string,
    { linkMap, fromFile, siteBaseUrl }: LinkContext
): string {
    if (!href.startsWith('/') || href.startsWith('//')) return href
    const [pagePath = '', anchor] = href.split('#')
    const target = linkMap.get(pagePath)
    const hash = anchor ? `#${anchor}` : ''
    if (target && fromFile) {
        let rel = path.posix.relative(path.posix.dirname(fromFile), target)
        if (!rel.startsWith('.')) rel = `./${rel}`
        return rel + hash
    }
    return `${siteBaseUrl}${pagePath}${hash}`
}

// <img src="/dir/images/x.png" alt="..." style={{...}} /> -> ![...](images/x.png),
// relative to the page when it is in the same site directory. cf-docs centers
// some screenshots with a fixed inline style, which the plain markdown keeps as
// an img marker: ![alt](x.png) <!-- img width=50% -->. Any other style stays
// raw JSX (and is flagged as unhandled).
const IMG_STYLE =
    /^\s*display: 'block', margin: '0 auto', maxWidth: '([^']+)', height: 'auto'\s*$/

function rewriteImages(line: string, cfFile: string | undefined): string {
    const cfDir = path.posix.dirname((cfFile ?? '').replace(/^docs-main\//, ''))
    // plain markdown images with an absolute site path become relative too, so
    // that they resolve in this repository (the file has to sit there)
    line = line.replace(
        /!\[([^\]]*)\]\((\/[^)\s]+)\)/g,
        (match: string, alt: string, src: string) =>
            cfFile
                ? `![${alt}](${path.posix.relative('/' + cfDir, src)})`
                : match
    )
    return line.replace(
        /<img\s+([^>]*?)\/>/g,
        (match: string, attrs: string) => {
            const a = parseAttrs(attrs)
            if (!a.src) return match
            const style = attrs.match(/style=\{\{(.*?)\}\}/)?.[1]
            const width = style?.match(IMG_STYLE)?.[1]
            if (style !== undefined && width === undefined) return match
            const src =
                cfFile && a.src.startsWith('/')
                    ? path.posix.relative('/' + cfDir, a.src)
                    : a.src
            const marker = width ? ` <!-- img width=${width} -->` : ''
            return `![${a.alt ?? ''}](${src})${marker}`
        }
    )
}

function rewriteLinks(line: string, ctx: LinkContext): string {
    return line.replace(
        /\]\((\/[^)\s]*)\)/g,
        (_match: string, href: string) => `](${rewriteLink(href, ctx)})`
    )
}

function parseAttrs(src: string): Record<string, string | undefined> {
    const attrs: Record<string, string | undefined> = {}
    for (const m of src.matchAll(/(\w+)=(?:"([^"]*)"|\{([^}]*)\})/g)) {
        attrs[m[1] as string] = m[2] ?? m[3]
    }
    return attrs
}

function indentOf(line: string | undefined): number {
    return line === undefined ? 0 : line.length - line.trimStart().length
}

export function mdxToMd(
    mdx: string,
    { linkMap, fromFile, siteBaseUrl, cfFile, warn }: ConvertOptions
): string {
    const ctx: LinkContext = { linkMap, fromFile, siteBaseUrl }
    const lines = mdx
        .replace(/\r\n/g, '\n')
        // COPIED_START/END provenance markers are dropped: nothing reads them
        .replace(/^\{\/\* COPIED_(START|END).*\*\/\}[ \t]*\n?/gm, '')
        // snippet components are not available here: drop unused imports, flag used ones
        .replace(
            /^import (\w+) from ["']\/snippets\/[^"']+["'];?[ \t]*\n?/gm,
            (line: string, name: string) => {
                if (new RegExp(`<${name}[\\s/>]`).test(mdx)) {
                    warn?.(`snippet component in use: ${name}`)
                    return line
                }
                return ''
            }
        )
        .split('\n')
    const out: string[] = []
    let inFence = false
    let tabStrip: number | null = null // spaces to remove inside the current <Tab>
    let inTab = false
    let inNote = false
    let inCard: CardState | null = null // accumulating a <Card ...> element

    const push = (l: string) => out.push(l)
    const stripTab = (l: string) =>
        inTab && tabStrip ? l.slice(Math.min(tabStrip, indentOf(l))) : l

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i] as string

        // --- include blocks collapse to the marker line, the code is dropped
        const inc = line.match(
            /^\s*\{\/\* include (\[[^\]]*\]\([^)\s]+\))(?: (.*?))? \*\/\}\s*$/
        )
        if (inc && !inFence) {
            push(`${inc[1]} <!-- include${inc[2] ? ' ' + inc[2] : ''} -->`)
            while (
                i + 1 < lines.length &&
                !/^\s*\{\/\* \/include \*\/\}\s*$/.test(lines[i + 1] as string)
            )
                i++
            i++
            continue
        }

        // --- fenced code: copy verbatim (de-indented inside tabs)
        if (/^(\s*)(```|~~~)/.test(line)) {
            push(stripTab(line))
            inFence = !inFence
            continue
        }
        if (inFence) {
            push(stripTab(line))
            continue
        }

        // --- Tabs
        if (/^\s*<Tabs>\s*$/.test(line)) {
            push('<!-- tabs -->')
            continue
        }
        if (/^\s*<\/Tabs>\s*$/.test(line)) {
            push('')
            push('<!-- /tabs -->')
            continue
        }
        const tab = line.match(/^(\s*)<Tab\s+title="([^"]*)"\s*>\s*$/)
        if (tab) {
            inTab = true
            // content indentation = indentation of the first non-blank line
            let j = i + 1
            while (j < lines.length && (lines[j] as string).trim() === '') j++
            tabStrip = indentOf(lines[j])
            push(`<!-- tab: ${tab[2]} -->`)
            push('')
            push(`**${tab[2]}**`)
            push('')
            continue
        }
        if (/^\s*<\/Tab>\s*$/.test(line)) {
            inTab = false
            tabStrip = null
            push('')
            continue
        }

        // --- before/after blocks
        if (/^\s*<div className="before-after">\s*$/.test(line)) {
            push('<!-- before-after -->')
            continue
        }
        if (/^\s*<\/div>\s*$/.test(line)) {
            push('<!-- /before-after -->')
            continue
        }

        // --- Steps: <!-- steps --> around ### headings, one per step
        if (/^\s*<Steps>\s*$/.test(line)) {
            push('<!-- steps -->')
            push('')
            continue
        }
        if (/^\s*<\/Steps>\s*$/.test(line)) {
            push('')
            push('<!-- /steps -->')
            continue
        }
        const step = line.match(/^\s*<Step\s+title="([^"]*)"\s*>\s*$/)
        if (step) {
            push(`### ${step[1]}`)
            push('')
            continue
        }
        if (/^\s*<\/Step>\s*$/.test(line)) {
            push('')
            continue
        }

        // --- Note callouts
        const alert = line.match(/^\s*<(Note|Tip|Info|Warning)>\s*$/)
        if (alert) {
            inNote = true
            push(`> [!${ALERTS[alert[1] as string]}]`)
            continue
        }
        if (/^\s*<\/(Note|Tip|Info|Warning)>\s*$/.test(line)) {
            inNote = false
            continue
        }

        // --- Cards
        const group = line.match(/^\s*<CardGroup(?:\s+cols=\{(\d+)\})?\s*>\s*$/)
        if (group) {
            push(`<!-- cards cols=${group[1] ?? 2} -->`)
            continue
        }
        if (/^\s*<\/CardGroup>\s*$/.test(line)) {
            push('<!-- /cards -->')
            continue
        }
        if (/^\s*<Card\b/.test(line) && !inCard) {
            inCard = { head: line, body: [], open: />\s*$/.test(line) }
            continue
        }
        if (inCard) {
            if (!inCard.open) {
                inCard.head += ' ' + line.trim()
                if (/>\s*$/.test(line)) inCard.open = true
                continue
            }
            if (/^\s*<\/Card>\s*$/.test(line)) {
                const a = parseAttrs(inCard.head)
                const icon = a.icon ? ` <!-- icon: ${a.icon} -->` : ''
                const href = rewriteLink(a.href ?? '', ctx)
                push(
                    `- [${a.title}](${href})${icon} ${inCard.body.join(' ').trim()}`.trimEnd()
                )
                inCard = null
                continue
            }
            inCard.body.push(line.trim())
            continue
        }

        // --- everything else
        if (inTab && tabStrip) line = stripTab(line)
        line = rewriteImages(line, cfFile)
        line = rewriteLinks(line, ctx)
        if (inNote) line = line.trim() === '' ? '>' : `> ${line.trim()}`
        push(line)
    }

    const result = out
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s+$/, '\n')

    // anything JSX-like left outside code is something we do not handle yet
    let fenced = false
    for (const l of result.split('\n')) {
        if (/^\s*(```|~~~)/.test(l)) fenced = !fenced
        if (
            !fenced &&
            /<\/?[A-Z][A-Za-z]*[\s>/]/.test(l.replace(/`[^`]*`/g, ''))
        ) {
            warn?.(`unhandled JSX: ${l.trim()}`)
        }
    }
    return result
}

// CLI. Read-only: prints the converted markdown of one page from
// docs-sync.json to stdout. A migrated page can be checked against its cf-docs
// source with
//   tsx scripts/src/docs-sync/mdx-to-md.ts ../cf-docs <page> | pnpm prettier --stdin-filepath <page> | diff - <page>
// (differences are hand-made changes and include blocks).
function convertPage(cfDocs: string, wanted: string): string | undefined {
    const manifest = loadManifest()
    const page = manifest.pages.find((p) => p.wallet === wanted)
    if (!page) return undefined
    return mdxToMd(fs.readFileSync(path.join(cfDocs, page.cf), 'utf8'), {
        linkMap: buildLinkMap(manifest),
        fromFile: page.wallet,
        cfFile: page.cf,
        siteBaseUrl: manifest.siteBaseUrl,
        warn: (m) => {
            console.warn(`${page.wallet}: ${m}`)
            process.exitCode = 1
        },
    })
}

if (process.argv[1]?.endsWith('mdx-to-md.ts')) {
    const program = new Command()
        .name('mdx-to-md')
        .description(
            'Print the markdown conversion of a cf-docs page listed in docs/docs-sync.json'
        )
        .argument('<cf-docs>', 'path to a checkout of canton-network/cf-docs')
        .argument('<wallet-page>', 'wallet page path from docs/docs-sync.json')
        .action((cfDocs, wanted) => {
            const md = convertPage(cfDocs, wanted)
            if (md === undefined) {
                program.error(`not in docs/docs-sync.json: ${wanted}`, {
                    exitCode: 2,
                })
                return
            }
            process.stdout.write(md)
        })
    program.parse(process.argv)
}
