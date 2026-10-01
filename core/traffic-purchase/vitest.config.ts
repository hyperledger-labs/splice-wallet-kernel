// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig, defineProject } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
    test: {
        coverage: {
            include: ['src/**/*.ts'],
            /*
             * `src/index.ts` is excluded rather than left uncovered: it re-exports
             * `@daml.js/traffic-purchase-models-1.0.0`, which only exists after
             * `pnpm generate:traffic-purchase`, and coverage pulls every included file through
             * the transform whether a test imports it or not. Tests import
             * `./traffic-purchase-client.js` directly for the same reason.
             */
            exclude: [
                'src/generated-clients/**',
                'src/index.ts',
                'src/test-utils.ts',
            ],
            provider: 'v8',
            reporter: ['text', 'html', 'lcov', 'json-summary'],
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
                    name: 'node',
                    environment: 'node',
                    include: ['src/**/*.test.ts'],
                },
            }),
            defineProject({
                test: {
                    name: 'browser',
                    include: ['src/**/*.test.ts'],
                    browser: {
                        enabled: true,
                        provider: playwright(),
                        trace: 'off',
                        instances: [{ browser: 'chromium' }],
                        headless: true,
                    },
                },
            }),
        ],
    },
})
