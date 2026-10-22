// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { resolve } from 'path'
import { defineConfig, defineProject } from 'vitest/config'
import { WxtVitest } from 'wxt/testing/vitest-plugin'
import { standardDecorators } from '../../vite.decorators.js'
import { coverage } from '../../vitest.base.ts'

export default defineConfig({
    test: {
        coverage: {
            // Report-only: most of the extension has no unit tests yet.
            ...coverage({
                thresholds: {
                    lines: 0,
                    functions: 0,
                    branches: 0,
                    statements: 0,
                },
            }),
            include: ['entrypoints/**/*.ts', 'utils/**/*.ts'],
            exclude: ['**/*.test.ts', '**/rpc-gen/**'],
        },
        projects: [
            defineProject({
                test: {
                    name: 'extension-tests',
                    environment: 'node',
                    include: ['entrypoints/**/*.test.ts', 'utils/**/*.test.ts'],
                },
                plugins: [
                    WxtVitest(),
                    standardDecorators(resolve(import.meta.dirname, '**/*.ts')),
                ],
            }),
        ],
    },
})
