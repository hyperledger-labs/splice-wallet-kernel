// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig, defineProject } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            exclude: ['**/fixtures/**'],
        },
        projects: [
            defineProject({
                test: {
                    name: 'node',
                    environment: 'node',
                    include: ['src/**/*.test.ts'],
                    deps: {
                        inline: ['camelcase-keys', 'map-obj'],
                    },
                },
            }),
            defineProject({
                test: {
                    name: 'browser',
                    include: ['src/**/*.test.ts'],
                    deps: {
                        inline: ['camelcase-keys', 'map-obj'],
                    },
                    browser: {
                        enabled: true,
                        provider: playwright({
                            trace: 'off',
                            screenshot: 'off',
                            video: 'off',
                        }),
                        instances: [{ browser: 'chromium' }],
                        headless: true,
                    },
                },
            }),
        ],
    },
})
