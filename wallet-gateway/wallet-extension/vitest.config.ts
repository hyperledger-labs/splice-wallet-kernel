// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig, defineProject } from 'vitest/config'
import { WxtVitest } from 'wxt/testing/vitest-plugin'
import { coverage, nodeProject } from '../../vitest.base.ts'

export default defineConfig({
    test: {
        coverage: {
            // Report-only until the ported pages bring their tests.
            ...coverage({
                thresholds: {
                    lines: 0,
                    functions: 0,
                    branches: 0,
                    statements: 0,
                },
                exclude: ['src/ui/routeTree.gen.ts', '**/rpc-gen/**'],
            }),
            include: ['src/**/*.{ts,tsx}'],
        },
        projects: [
            // WxtVitest swaps `wxt/browser` for an in-memory fake browser and
            // applies the `@/` aliases from wxt.config.ts.
            defineProject({ ...nodeProject(), plugins: [WxtVitest()] }),
        ],
    },
})
