// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from '@playwright/test'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    timeout: 120 * 1000,
    expect: {
        timeout: 15_000,
    },
    testDir: './tests/e2e',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: 'html',
    use: {
        trace: process.env.CI ? 'on-first-retry' : 'on',
        screenshot: 'only-on-failure',
    },
    projects: [{ name: 'chromium' }],
    webServer: [
        {
            command: 'pnpm --filter @canton-network/example-ping preview',
            url: 'http://localhost:8080',
            reuseExistingServer: !process.env.CI,
            timeout: 120 * 1000,
            stdout: 'pipe',
            stderr: 'pipe',
        },
        {
            command: 'pnpm --filter @canton-network/mock-oauth2 start',
            url: 'http://127.0.0.1:8889/.well-known/openid-configuration',
            reuseExistingServer: !process.env.CI,
            timeout: 30 * 1000,
            stdout: 'pipe',
            stderr: 'pipe',
        },
    ],
})
