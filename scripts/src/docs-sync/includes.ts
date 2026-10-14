// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Checks the code sample markers in the markdown docs. The docs do not copy
// the (CI-tested) example files they show. A sample is a link to the example
// file, followed by an include comment on the same line:
//
//   [`scripts/01-init.ts`](../../examples/scripts/01-init.ts) <!-- include -->
//   [Full example](../../examples/scripts/05-preapproval.ts) <!-- include title="Full example" expandable -->
//
// The link is what readers see on GitHub. The path is relative to the markdown
// file. The sync with the central docs repository (sync.ts) replaces the line
// with a code block when it publishes the page: the language comes
// from the file extension, and what follows `include` (title, expandable)
// becomes the attributes of the code block.
//
// This script fails when an include comment is not preceded by a link, or
// when the linked file does not exist. It also checks the `<!-- img width=50% -->`
// comment that marks a centered screenshot: it has to follow an image, and that
// every `<!-- steps -->` is closed by `<!-- /steps -->`.
//
// usage: tsx scripts/src/docs-sync/includes.ts [paths...]
//        (default: all markdown under docs/)

import { Command } from '@commander-js/extra-typings'
import fs from 'node:fs'
import path from 'node:path'
import { getRepoRoot } from '../lib/utils.js'

const MARKER = /^\[[^\]]*\]\(([^)\s]+)\) <!-- include(?: [^\n]*?)? -->\s*$/
// ![alt](image.png) <!-- img width=50% --> (see mdx-to-md.ts)
const IMG_MARKER = /!\[[^\]]*\]\([^)\s]+\) <!-- img width=\S+ -->/

// markers that are only documented, inside fenced code or `inline code`
function withoutCode(markdown: string): string {
    return markdown.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
}

function run(targets: string[]) {
    const repoRoot = getRepoRoot()
    const files = targets.length
        ? targets
        : fs
              .globSync('docs/**/*.md', {
                  cwd: repoRoot,
                  exclude: (name) => name === 'node_modules',
              })
              .map((file) => path.join(repoRoot, file))
    let errors = 0
    const fail = (file: string, message: string) => {
        errors++
        console.error(`${path.relative(repoRoot, file)}: ${message}`)
    }
    for (const file of files) {
        const text = withoutCode(fs.readFileSync(file, 'utf8'))
        const opened = text.split('<!-- steps -->').length - 1
        const closed = text.split('<!-- /steps -->').length - 1
        if (opened !== closed)
            fail(file, 'every <!-- steps --> needs a <!-- /steps -->')
        for (const line of text.split('\n')) {
            if (line.includes('<!-- img')) {
                if (!IMG_MARKER.test(line))
                    fail(file, `img comment without an image: ${line}`)
                continue
            }
            if (!line.includes('<!-- include')) continue
            const link = line.match(MARKER)?.[1]
            if (link === undefined) {
                fail(
                    file,
                    `include comment without a link to the file: ${line}`
                )
            } else if (!fs.existsSync(path.resolve(path.dirname(file), link))) {
                fail(file, `included file not found: ${link}`)
            }
        }
    }
    if (errors) process.exit(1)
}

new Command()
    .name('docs-includes')
    .description('Check that every example file the docs include exists')
    .argument('[paths...]', 'markdown files (default: all docs under docs/)')
    .action((paths) => run(paths))
    .parse(process.argv)
