// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Syncs the files listed in docs/docs-sync.json with the central docs
// repository (canton-network/cf-docs), see docs/README.md.

import { Command } from '@commander-js/extra-typings'
import fs from 'node:fs'
import path from 'node:path'
import manifest from '../../docs/docs-sync.json' with { type: 'json' }
import { error, getRepoRoot, warn } from './lib/utils.js'

const repoRoot = getRepoRoot()

const INCLUDE = /^\s*\{\/\* include (\S+) \*\/\}$/
// the target of a link or an image: ](target), src="target" or href="target"
const LINK = /(\]\(|(?:src|href)=")([^)"\s#?]+)/g

const SITE = 'https://docs.canton.network'

const isRelative = (target: string) => !/^([a-z]+:|\/|#)/i.test(target)

// docs-main/sdks-tools/foo.mdx -> /sdks-tools/foo
const sitePath = (cfFile: string) =>
    '/' + cfFile.replace(/^docs-main\//, '').replace(/\.mdx$/, '')

const walletFileBySitePath = new Map(
    Object.entries(manifest).map(([wallet, cf]) => [sitePath(cf), wallet])
)

// relative links to synced files and full URLs -> their path on the site
function linksToCf(mdx: string, page: string): string {
    return mdx.replace(LINK, (link, prefix: string, target: string) => {
        if (target.startsWith(SITE + '/'))
            return prefix + target.slice(SITE.length)
        if (!isRelative(target)) return link
        const file = path.posix.join(path.posix.dirname(page), target)
        const cf = (manifest as Record<string, string>)[file]
        return cf ? prefix + sitePath(cf) : link
    })
}

// paths on the site -> relative links to synced files, full URLs otherwise
function linksToWallet(mdx: string, page: string): string {
    return mdx.replace(LINK, (link, prefix: string, target: string) => {
        const file = walletFileBySitePath.get(target)
        if (file)
            return prefix + path.posix.relative(path.posix.dirname(page), file)
        return target.startsWith('/') ? prefix + SITE + target : link
    })
}

function placeholder(file: string): string {
    const comment = /\.(sh|ya?ml)$/.test(file) ? '#' : '//'
    return `${comment} content of the included file, see docs/README.md`
}

/**
 * Replaces the content of the code block after each include comment with
 * `content(file)`, indented like the block. With `content` reading the file,
 *
 *     {/* include ../../examples/snippets/tap-coins.ts *\/}
 *     ```typescript
 *     // content of the included file, see docs/README.md
 *     ```
 *
 * becomes
 *
 *     {/* include ../../examples/snippets/tap-coins.ts *\/}
 *     ```typescript
 *     import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'
 *     ...
 *     ```
 *
 * and `placeholder` turns it back.
 */
function replaceIncludes(
    mdx: string,
    content: (file: string) => string
): string {
    const lines = mdx.split('\n')
    const out: string[] = []
    for (let i = 0; i < lines.length; i++) {
        out.push(lines[i]!)
        const file = lines[i]!.match(INCLUDE)?.[1]
        if (file === undefined) continue
        const fence = lines[++i] ?? ''
        if (!fence.trimStart().startsWith('```'))
            throw new Error(`no code block after the include of ${file}`)
        const indent = fence.match(/^ */)![0]
        out.push(fence)
        for (const line of content(file).trimEnd().split('\n'))
            out.push(line && indent + line)
        out.push(indent + '```')
        // skip the old content, up to the closing fence
        i++
        while (i < lines.length && lines[i]!.trim() !== '```') i++
        if (i === lines.length)
            throw new Error(`unclosed code block after the include of ${file}`)
    }
    return out.join('\n')
}

function check() {
    let errors = 0
    const fail = (file: string, message: string) => {
        errors++
        console.error(error(`${file}: ${message}`))
    }
    for (const page of Object.keys(manifest)) {
        if (!fs.existsSync(path.join(repoRoot, page))) {
            fail(page, 'listed in docs/docs-sync.json but missing')
            continue
        }
        if (!page.endsWith('.mdx')) continue
        const mdx = fs.readFileSync(path.join(repoRoot, page), 'utf8')
        const included: string[] = []
        try {
            const emptied = replaceIncludes(mdx, (file) => {
                included.push(file)
                return placeholder(file)
            })
            if (emptied !== mdx)
                fail(page, 'an included code block has to hold the placeholder')
        } catch (e) {
            fail(page, (e as Error).message)
        }
        for (const file of included)
            if (
                !fs.existsSync(path.resolve(repoRoot, path.dirname(page), file))
            )
                fail(page, `included file not found: ${file}`)
    }
    if (errors) process.exit(1)
}

function copy(direction: 'to-cf' | 'from-cf', cfDocs: string) {
    for (const [walletFile, cfFile] of Object.entries(manifest)) {
        const wallet = path.join(repoRoot, walletFile)
        const cf = path.join(cfDocs, cfFile)
        const [from, to] = direction === 'to-cf' ? [wallet, cf] : [cf, wallet]
        if (!fs.existsSync(from)) {
            console.warn(warn(`missing, not copied: ${from}`))
            continue
        }
        if (!fs.existsSync(to)) console.warn(warn(`new file: ${to}`))
        fs.mkdirSync(path.dirname(to), { recursive: true })
        if (!walletFile.endsWith('.mdx')) {
            fs.copyFileSync(from, to)
            continue
        }
        const mdx = fs.readFileSync(from, 'utf8')
        fs.writeFileSync(
            to,
            direction === 'to-cf'
                ? linksToCf(
                      replaceIncludes(mdx, (file) =>
                          fs.readFileSync(
                              path.resolve(path.dirname(wallet), file),
                              'utf8'
                          )
                      ),
                      walletFile
                  )
                : linksToWallet(replaceIncludes(mdx, placeholder), walletFile)
        )
    }
}

const program = new Command()
    .name('docs-sync')
    .description('Sync the docs with the central docs repository (cf-docs)')

program
    .command('check')
    .description('Check the include comments and that the files exist')
    .action(check)

program
    .command('to-cf')
    .description('Copy the docs into a cf-docs checkout')
    .argument('<cf-docs>', 'path to the cf-docs checkout')
    .action((cfDocs) => copy('to-cf', cfDocs))

program
    .command('from-cf')
    .description('Copy the docs from a cf-docs checkout')
    .argument('<cf-docs>', 'path to the cf-docs checkout')
    .action((cfDocs) => copy('from-cf', cfDocs))

program.parse(process.argv)
