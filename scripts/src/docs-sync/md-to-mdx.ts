// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Converts a plain-markdown page of this repository to the Mintlify .mdx
// conventions of the central docs repository (cf-docs). It is the inverse of
// mdx-to-md.ts, see there for the constructs. On top of that:
//   [text](path) <!-- include attrs -->  -> fenced block with the content of the
//                                           linked file, wrapped in
//                                           {/* include [text](path) attrs */} ... {/* /include */}
//   ![alt](relative.png)                 -> ![alt](/absolute/site/path.png), with a
//                                           <!-- img width=50% --> marker a centered <img>
//   > [!WARNING] / [!TIP] / ...          -> <Warning> / <Tip> / ...
//   <!-- steps --> ### X <!-- /steps --> -> <Steps><Step title="X">...</Step></Steps>

import { Command } from '@commander-js/extra-typings'
import fs from 'node:fs'
import path from 'node:path'
import { buildReverseLinkMap, loadManifest } from '../lib/docs-sync.js'
import { getRepoRoot } from '../lib/utils.js'

export type MdToMdxOptions = {
    // wallet page path relative to the repo root, and its cf-docs page
    walletFile: string
    cfFile: string
    // wallet repo path -> cf-docs site path, for the paired pages
    reverseLinkMap: Map<string, string>
    siteBaseUrl: string
    repoRoot: string
    warn?: (message: string) => void
}

const INCLUDE = /^\[([^\]]*)\]\(([^)\s]+)\) <!-- include(?: ([^\n]*?))? -->\s*$/

const LANGUAGES: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    json: 'json',
    sh: 'bash',
    py: 'python',
    daml: 'daml',
    yaml: 'yaml',
    yml: 'yaml',
}

const ALERTS: Record<string, string> = {
    NOTE: 'Note',
    TIP: 'Tip',
    IMPORTANT: 'Info',
    WARNING: 'Warning',
    CAUTION: 'Warning',
}

function unquote(value: string): string {
    const v = value.trim()
    if (v.startsWith("'") && v.endsWith("'"))
        return v.slice(1, -1).replace(/''/g, "'")
    if (v.startsWith('"') && v.endsWith('"')) return JSON.parse(v)
    return v
}

// cf-docs writes frontmatter values double-quoted
function convertFrontmatter(block: string): string {
    return block
        .split('\n')
        .map((line) => {
            const m = line.match(/^(\w+):\s*(.+)$/)
            return m
                ? `${m[1]}: ${JSON.stringify(unquote(m[2] as string))}`
                : line
        })
        .join('\n')
}

function rewriteLinks(line: string, o: MdToMdxOptions): string {
    const dir = path.posix.dirname(o.walletFile)
    const cfDir = path.posix.dirname(o.cfFile.replace(/^docs-main\//, ''))
    // images: a relative src becomes the absolute site path. cf-docs mostly
    // uses plain markdown images, so only an img marker (see mdx-to-md.ts)
    // produces the centered <img>.
    line = line.replace(
        /!\[([^\]]*)\]\(([^)\s]+)\)(?: <!-- img width=(\S+) -->)?/g,
        (_m: string, alt: string, src: string, width?: string) => {
            const site = /^(https?:|\/)/.test(src)
                ? src
                : '/' + path.posix.join(cfDir, src)
            return width
                ? `<img src="${site}" alt="${alt}" style={{ display: 'block', margin: '0 auto', maxWidth: '${width}', height: 'auto' }} />`
                : `![${alt}](${site})`
        }
    )
    return line.replace(
        /(?<!!)\]\(([^)\s]+)\)/g,
        (match: string, href: string) => {
            if (href.startsWith(o.siteBaseUrl + '/'))
                return `](${href.slice(o.siteBaseUrl.length)})`
            if (/^([a-z]+:|#|\/\/|\/)/i.test(href)) return match
            const [rel = '', anchor] = href.split('#')
            const target = path.posix.normalize(path.posix.join(dir, rel))
            const site = o.reverseLinkMap.get(target)
            if (site) return `](${site}${anchor ? `#${anchor}` : ''})`
            if (/\.mdx?$/.test(rel))
                o.warn?.(`link to a page that is not in the manifest: ${href}`)
            return match
        }
    )
}

function includeBlock(
    text: string,
    link: string,
    attrs: string | undefined,
    o: MdToMdxOptions
): string[] {
    const file = path.resolve(o.repoRoot, path.dirname(o.walletFile), link)
    const ext = path.extname(file).slice(1)
    const lang = LANGUAGES[ext]
    if (lang === undefined) o.warn?.(`no language for include: ${link}`)
    const code = fs.readFileSync(file, 'utf8').replace(/\n+$/, '')
    return [
        `{/* include [${text}](${link})${attrs ? ' ' + attrs : ''} */}`,
        `\`\`\`${lang ?? ext}${attrs ? ' ' + attrs : ''}`,
        ...code.split('\n'),
        '```',
        '{/* /include */}',
    ]
}

export function mdToMdx(md: string, o: MdToMdxOptions): string {
    let body = md.replace(/\r\n/g, '\n')
    let frontmatter = ''
    const fm = body.match(/^---\n([\s\S]*?)\n---\n/)
    if (fm) {
        frontmatter = `---\n${convertFrontmatter(fm[1] as string)}\n---\n`
        body = body.slice(fm[0].length)
    }

    const lines = body.split('\n')
    const out: string[] = []
    let inFence = false
    let inTabs = false
    let inTab = false
    let inCards = false
    // <!-- steps -->: the headings of the level of the first one are the steps
    let stepLevel = 0
    let inStep = false
    const closeStep = () => {
        if (!inStep) return
        while (out.length && out[out.length - 1] === '') out.pop()
        out.push('</Step>')
        inStep = false
    }
    const indent = () => (inTab ? '    ' : '')
    const push = (l: string) => out.push(l === '' ? l : indent() + l)
    const closeTab = () => {
        if (!inTab) return
        while (out.length && out[out.length - 1] === '') out.pop()
        inTab = false
        out.push('  </Tab>')
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] as string

        // --- fenced code: verbatim
        if (/^(```|~~~)/.test(line)) {
            push(line)
            inFence = !inFence
            continue
        }
        if (inFence) {
            push(line)
            continue
        }

        // --- include markers
        const inc = line.match(INCLUDE)
        if (inc) {
            for (const l of includeBlock(
                inc[1] as string,
                inc[2] as string,
                inc[3],
                o
            ))
                push(l)
            continue
        }

        // --- steps
        if (line === '<!-- steps -->') {
            let j = i + 1
            while (j < lines.length && !/^#{1,6} /.test(lines[j] as string)) j++
            stepLevel = ((lines[j] ?? '').match(/^#+/)?.[0] ?? '').length
            if (stepLevel === 0) o.warn?.('steps without a heading')
            push('<Steps>')
            continue
        }
        if (line === '<!-- /steps -->') {
            closeStep()
            stepLevel = 0
            push('</Steps>')
            continue
        }
        const stepHeading = stepLevel > 0 ? line.match(/^(#+) (.*)$/) : null
        if (stepHeading && (stepHeading[1] as string).length === stepLevel) {
            if (inStep) {
                closeStep()
                out.push('')
            }
            const title = stepHeading[2] as string
            if (title.includes('"')) o.warn?.(`quote in step title: ${title}`)
            out.push(`<Step title="${title}">`)
            inStep = true
            while (lines[i + 1] === '') i++
            continue
        }

        // --- tabs
        if (line === '<!-- tabs -->') {
            inTabs = true
            push('<Tabs>')
            continue
        }
        if (line === '<!-- /tabs -->') {
            closeTab()
            inTabs = false
            push('</Tabs>')
            continue
        }
        const tab = line.match(/^<!-- tab: (.*) -->$/)
        if (tab && inTabs) {
            closeTab()
            out.push(`  <Tab title="${tab[1]}">`)
            inTab = true
            // the **Title** heading that follows is only for plain markdown
            let j = i + 1
            while (lines[j] === '') j++
            if (lines[j] === `**${tab[1]}**`) j++
            while (lines[j] === '') j++
            i = j - 1
            continue
        }

        // --- before/after
        if (line === '<!-- before-after -->') {
            push('<div className="before-after">')
            continue
        }
        if (line === '<!-- /before-after -->') {
            push('</div>')
            continue
        }

        // --- alerts
        const alert = line.match(/^> \[!(\w+)\]\s*$/)
        if (alert && ALERTS[alert[1] as string]) {
            const tag = ALERTS[alert[1] as string]
            push(`<${tag}>`)
            while ((lines[i + 1] ?? '').startsWith('>')) {
                i++
                push(rewriteLinks((lines[i] as string).replace(/^> ?/, ''), o))
            }
            push(`</${tag}>`)
            continue
        }

        // --- cards
        const group = line.match(/^<!-- cards cols=(\d+) -->$/)
        if (group) {
            inCards = true
            push(`<CardGroup cols={${group[1]}}>`)
            continue
        }
        if (line === '<!-- /cards -->') {
            inCards = false
            push('</CardGroup>')
            continue
        }
        const card = inCards
            ? line.match(
                  /^- \[(.*?)\]\(([^)]*)\)(?: <!-- icon: ([^ ]+) -->)? ?(.*)$/
              )
            : null
        if (card) {
            const href = rewriteLinks(`](${card[2]})`, o).slice(2, -1)
            push('  <Card')
            push(`    title="${card[1]}"`)
            if (card[3]) push(`    icon="${card[3]}"`)
            push(`    href="${href}"`)
            push('  >')
            if (card[4]) push(`    ${card[4]}`)
            push('  </Card>')
            continue
        }

        push(rewriteLinks(line, o))
    }

    const result = out
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s+$/, '\n')

    let fenced = false
    for (const l of result.split('\n')) {
        if (/^\s*(```|~~~)/.test(l)) fenced = !fenced
        if (!fenced && /<!-- /.test(l))
            o.warn?.(`unhandled comment: ${l.trim()}`)
    }
    return frontmatter + (frontmatter ? '\n' : '') + result.replace(/^\n+/, '')
}

export function convertPage(wanted: string): string | undefined {
    const manifest = loadManifest()
    const page = manifest.pages.find((p) => p.wallet === wanted)
    if (!page) return undefined
    const repoRoot = getRepoRoot()
    return mdToMdx(fs.readFileSync(path.join(repoRoot, page.wallet), 'utf8'), {
        walletFile: page.wallet,
        cfFile: page.cf,
        reverseLinkMap: buildReverseLinkMap(manifest),
        siteBaseUrl: manifest.siteBaseUrl,
        repoRoot,
        warn: (m) => {
            console.warn(`${page.wallet}: ${m}`)
            process.exitCode = 1
        },
    })
}

// CLI. With a cf-docs checkout and --write, overwrites the paired pages there
// (inspect with `git diff` in the checkout); without it prints one page.
if (process.argv[1]?.endsWith('md-to-mdx.ts')) {
    new Command()
        .name('md-to-mdx')
        .description(
            'Convert wallet pages from docs/docs-sync.json to cf-docs mdx'
        )
        .argument('[wallet-page]', 'print this page to stdout')
        .option(
            '--write <cf-docs>',
            'write all pages into this cf-docs checkout'
        )
        .action((wanted, opts) => {
            if (opts.write) {
                const manifest = loadManifest()
                for (const p of manifest.pages) {
                    const mdx = convertPage(p.wallet) as string
                    fs.mkdirSync(path.dirname(path.join(opts.write, p.cf)), {
                        recursive: true,
                    })
                    const target = path.join(opts.write, p.cf)
                    fs.writeFileSync(target, mdx)
                }
                return
            }
            const mdx = wanted ? convertPage(wanted) : undefined
            if (mdx === undefined) {
                console.error('give a wallet page from docs/docs-sync.json')
                process.exit(2)
            }
            process.stdout.write(mdx)
        })
        .parse(process.argv)
}
