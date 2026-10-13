// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig, defineProject } from 'vitest/config'
import { WxtVitest } from 'wxt/testing/vitest-plugin'
import { coverage } from '../../vitest.base.ts'

export default defineConfig({
    test: {
        coverage: coverage({
            exclude: ['src/index.ts'],
            thresholds: { branches: 0 },
        }),
        projects: [
            defineProject({
                test: {
                    name: 'extension-tests',
                    include: ['src/**/*.test.ts'],
                },
                plugins: [WxtVitest()],
            }),
        ],
    },
})
