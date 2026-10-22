// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config'
import { standardDecorators } from '../../vite.decorators.js'
import { browserProject, coverage } from '../../vitest.base.ts'
import path from 'node:path'
import { readdirSync, readFileSync } from 'node:fs'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'

// The packages the React sources and stories import (type-only imports and
// workspace packages left out).
//
// Vite caches its pre-bundled dependencies. A new import in a source file is
// not in that cache, so Vite finds it while the tests are already running,
// re-bundles and reloads the page, which fails the files that are mid-run
// ("Failed to fetch dynamically imported module ... /deps/..."). Listing the
// packages makes Vite rebuild its cache at startup whenever the list changes.
// It is derived from the sources, so a new icon or package needs no manual entry.
const reactDependencies = (): string[] => {
    const root = path.join(import.meta.dirname, 'src/react')
    const dependencies = new Set<string>()

    for (const file of readdirSync(root, {
        recursive: true,
        encoding: 'utf8',
    })) {
        if (!/\.tsx?$/.test(file)) continue

        const source = readFileSync(path.join(root, file), 'utf8')
        for (const [, specifier] of source.matchAll(
            /^(?:import|export)\s(?!type\s)[^;]*?from\s+'([^'.][^']*)'/gm
        )) {
            if (!specifier!.startsWith('@canton-network/')) {
                dependencies.add(specifier!)
            }
        }
    }

    return [...dependencies].sort()
}

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
    test: {
        coverage: coverage({
            exclude: ['src/**/*.lit.stories.ts', 'src/vite-env.d.ts'],
        }),
        projects: [
            browserProject({
                plugins: [
                    standardDecorators(
                        path.resolve(import.meta.dirname, 'src/**/*.ts')
                    ),
                ],
            }),
            {
                extends: true,
                plugins: [
                    // The plugin will run tests for the stories defined in your Storybook config
                    // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
                    storybookTest({
                        configDir: path.join(import.meta.dirname, '.storybook'),
                    }),
                ],
                optimizeDeps: { include: reactDependencies() },
                test: {
                    name: 'storybook',
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: playwright({}),
                        instances: [
                            {
                                browser: 'chromium',
                            },
                        ],
                    },
                },
            },
        ],
    },
})
