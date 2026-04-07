// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig, defineProject } from 'vitest/config'

export default defineConfig({
    test: {
        coverage: {
            include: ['src/**/*.ts'],
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            thresholds: {
                lines: 0,
                functions: 0,
                branches: 0,
                statements: 0,
            },
        },
        environment: 'node',
        include: ['src/**/*.test.ts'],
        projects: [
            defineProject({
                test: {
                    name: 'integration',
                    environment: 'happy-dom',
                    include: [
                        'src/integration-test/**/*.sync.test.ts',
                        'src/integration-test/**/*.async.test.ts',
                    ],
                    setupFiles: ['./src/integration-test/setup-happy-dom.ts'],
                },
            }),
        ],
    },
})
