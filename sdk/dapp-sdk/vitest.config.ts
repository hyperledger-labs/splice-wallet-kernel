// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig, defineProject } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
    define: {
        'import.meta.env.VITE_MOCK_REMOTE_URL': JSON.stringify(
            'http://127.0.0.1:13030'
        ),
    },
    test: {
        globalSetup: ['./vitest.global-setup.ts'],
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
        include: [],
        projects: [
            defineProject({
                test: {
                    name: 'browser-async',
                    include: ['src/integration-test/async.test.ts'],
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
