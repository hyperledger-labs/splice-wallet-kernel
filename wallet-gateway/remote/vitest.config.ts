// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig, defineProject } from 'vitest/config'

export default defineConfig({
    test: {
        coverage: {
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.test.ts'],
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 80,
                statements: 80,
            },
        },
        projects: [
            defineProject({
                test: {
                    name: 'node',
                    environment: 'node',
                    include: ['src/**/*.test.ts'],
                    setupFiles: ['./vitest.setup.ts'],
                },
            }),
        ],
    },
})
