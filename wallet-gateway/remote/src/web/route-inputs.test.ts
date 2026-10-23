// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { resolveRouteInputs } from './route-inputs.js'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const frontendRoot = resolve(packageRoot, 'src/web/frontend')

function collectIndexHtmlFiles(dir: string): string[] {
    const entries: string[] = []
    for (const name of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, name.name)
        if (name.isDirectory()) {
            entries.push(...collectIndexHtmlFiles(path))
            continue
        }
        if (name.name === 'index.html') {
            entries.push(resolve(path))
        }
    }
    return entries
}

describe('vite build inputs vs dev frontend pages', () => {
    it('includes every index.html under src/web/frontend in rolldownOptions.input', () => {
        const devPages = collectIndexHtmlFiles(frontendRoot).sort()
        const buildInputs = Object.values(
            resolveRouteInputs(frontendRoot)
        ).sort()

        expect(buildInputs).toEqual(devPages)
    })
})
