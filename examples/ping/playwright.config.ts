// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    defineConfig,
    devices,
    type PlaywrightTestConfig,
} from '@playwright/test'
import { config as loadEnv } from 'dotenv'

loadEnv({ quiet: true, path: ['.env', '.env.local'] })

const blockdaemonApiUrl = process.env.BLOCKDAEMON_API_URL
const dfnsApiUrl = process.env.DFNS_BASE_URL
const fireblocksApiPath = process.env.FIREBLOCKS_API_PATH

const webServers: Extract<PlaywrightTestConfig['webServer'], unknown[]> = []
const isLocalhost = (url: URL) =>
    ['localhost', '127.0.0.1'].includes(url.hostname)

// If localhost is set as external signing provider url, then start a mock api for tests
if (blockdaemonApiUrl) {
    const url = new URL(blockdaemonApiUrl)
    if (isLocalhost(url)) {
        const healthUrl = `${url.origin}/_healthz`
        webServers.push({
            command:
                'pnpm --filter @canton-network/example-ping mock:signing-providers:blockdaemon',
            url: healthUrl,
            reuseExistingServer: !process.env.CI,
            timeout: 30 * 1000,
            stdout: 'pipe',
            stderr: 'pipe',
        })
    }
}

if (dfnsApiUrl) {
    const dfnsHealthUrl = `${new URL(dfnsApiUrl).origin}/_healthz`
    const url = new URL(dfnsHealthUrl)
    if (isLocalhost(url)) {
        const healthUrl = `${url.origin}/_healthz`
        webServers.push({
            command:
                'pnpm --filter @canton-network/example-ping mock:signing-providers:dfns',
            url: healthUrl,
            reuseExistingServer: !process.env.CI,
            timeout: 30 * 1000,
            stdout: 'pipe',
            stderr: 'pipe',
        })
    }
}

if (fireblocksApiPath) {
    const url = new URL(fireblocksApiPath)
    if (isLocalhost(url)) {
        const healthUrl = `${url.origin}/_healthz`
        webServers.push({
            command:
                'pnpm --filter @canton-network/example-ping mock:signing-providers:fireblocks',
            url: healthUrl,
            reuseExistingServer: !process.env.CI,
            timeout: 30 * 1000,
            stdout: 'pipe',
            stderr: 'pipe',
        })
    }
}

const externalSigningProviderTests = [
    '**/blockdaemon.spec.ts',
    '**/dfns.spec.ts',
    '**/fireblocks.spec.ts',
]

// Fork PR workflows set CI_SECRET_DEPENDENCY to "false" (repo vars unavailable).
// When unset (local dev), external signing e2e tests still run against mocks in .env.
const includeCiSecretDependency = process.env.CI_SECRET_DEPENDENCY !== 'false'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    // Max time for test
    timeout: 120 * 1000,
    // Max time for assertion
    expect: {
        timeout: 15_000,
    },
    testDir: './tests',
    testIgnore: includeCiSecretDependency
        ? undefined
        : externalSigningProviderTests,
    /* Run tests in files in parallel */
    fullyParallel: false,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: 1,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: 'html',
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        // baseURL: 'http://localhost:3030',

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: process.env.CI ? 'on-first-retry' : 'on',
        video: process.env.CI ? 'on-first-retry' : 'on',
    },

    /* Configure projects for major browsers.
     * Multisession runs last via project dependencies so it does not
     * interfere with (or get interfered by) other e2e specs. */
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },

        // {
        //     name: 'webkit',
        //     use: { ...devices['Desktop Safari'] },
        // },
        /* Test against mobile viewports. */
        // {
        //   name: 'Mobile Chrome',
        //   use: { ...devices['Pixel 5'] },
        // },
        // {
        //   name: 'Mobile Safari',
        //   use: { ...devices['iPhone 12'] },
        // },
        /* Test against branded browsers. */
        // {
        //   name: 'Microsoft Edge',
        //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
        // },
        // {
        //   name: 'Google Chrome',
        //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
        // },
    ],

    webServer: webServers,
})
