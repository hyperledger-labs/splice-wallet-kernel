// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    test as base,
    Page,
    ConsoleMessage,
    Request,
    Response,
} from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

interface LogEntry {
    timestamp: string
    type: string
    message: string
    source?: string
}

// Helper to safely check if a page is still accessible
const isPageAccessible = async (p: Page): Promise<boolean> => {
    try {
        if (p.isClosed()) return false
        await p.evaluate(() => true)
        return true
    } catch {
        return false
    }
}

// Helper to capture screenshot and attach to test
const captureScreenshot = async (
    p: Page,
    screenshotDir: string,
    sanitizedTitle: string,
    timestamp: string,
    label: string,
    /* eslint-disable @typescript-eslint/no-explicit-any */
    testInfo: typeof import('@playwright/test').test extends import('@playwright/test').PlaywrightTestArgs &
        import('@playwright/test').PlaywrightTestOptions &
        import('@playwright/test').PlaywrightWorkerArgs &
        import('@playwright/test').PlaywrightWorkerOptions & {
            [key: string]: any
        }
        ? any
        : any
    /* eslint-enable @typescript-eslint/no-explicit-any */
) => {
    const screenshotPath = path.join(
        screenshotDir,
        `${sanitizedTitle}_${label}_${timestamp}.png`
    )

    try {
        if (await isPageAccessible(p)) {
            await p.screenshot({
                path: screenshotPath,
                fullPage: true,
                timeout: 5000,
            })

            await testInfo.attach(`screenshot-${label}`, {
                path: screenshotPath,
                contentType: 'image/png',
            })

            console.log(`${label} screenshot saved to: ${screenshotPath}`)
        } else {
            console.error(`${label} is not accessible for screenshot`)
        }
    } catch (error) {
        console.error(
            `Failed to capture ${label} screenshot:`,
            (error as Error).message
        )
    }
}

// Helper to setup console tracking for a page
const setupConsoleTracking = (
    p: Page,
    source: string,
    consoleLogs: LogEntry[]
) => {
    p.on('console', (msg: ConsoleMessage) => {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            type: msg.type(),
            message: msg.text(),
            source,
        }
        consoleLogs.push(entry)

        if (msg.type() === 'error' || msg.type() === 'warning') {
            console.log(
                `[${source}] ${msg.type().toUpperCase()}: ${msg.text()}`
            )
        }
    })

    p.on('pageerror', (error) => {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            type: 'pageerror',
            message: error.message,
            source,
        }
        consoleLogs.push(entry)
        console.error(`[${source}] PAGE ERROR: ${error.message}`)
    })
}

// Helper to setup network tracking for a page
const setupNetworkTracking = (
    p: Page,
    source: string,
    networkLogs: LogEntry[]
) => {
    p.on('requestfailed', (request: Request) => {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            type: 'request-failed',
            message: `${request.method()} ${request.url()} - ${request.failure()?.errorText || 'unknown error'}`,
            source,
        }
        networkLogs.push(entry)
        console.error(`[${source}] REQUEST FAILED: ${entry.message}`)
    })

    p.on('response', (response: Response) => {
        if (response.status() >= 400) {
            const entry: LogEntry = {
                timestamp: new Date().toISOString(),
                type: `response-${response.status()}`,
                message: `${response.request().method()} ${response.url()} - Status: ${response.status()} ${response.statusText()}`,
                source,
            }
            networkLogs.push(entry)
            console.warn(
                `[${source}] HTTP ${response.status()}: ${response.url()}`
            )
        }
    })
}

export const test = base.extend<{ page: Page }>({
    page: async ({ page }, use, testInfo) => {
        const popups: Page[] = []
        const consoleLogs: LogEntry[] = []
        const networkLogs: LogEntry[] = []

        setupConsoleTracking(page, 'main', consoleLogs)
        setupNetworkTracking(page, 'main', networkLogs)

        page.on('popup', (popup) => {
            popups.push(popup)
            console.log(`Popup opened: ${popup.url()}`)

            setupConsoleTracking(
                popup,
                `popup-${popups.length - 1}`,
                consoleLogs
            )
            setupNetworkTracking(
                popup,
                `popup-${popups.length - 1}`,
                networkLogs
            )

            popup.on('close', () => {
                const index = popups.indexOf(popup)
                if (index > -1) {
                    popups.splice(index, 1)
                }
            })
        })

        await use(page)

        if (testInfo.status !== testInfo.expectedStatus) {
            const screenshotDir = path.join(
                testInfo.project.outputDir,
                'screenshots'
            )

            if (!fs.existsSync(screenshotDir)) {
                fs.mkdirSync(screenshotDir, { recursive: true })
            }

            const sanitizedTitle = testInfo.title
                .replace(/[^a-z0-9]/gi, '_')
                .toLowerCase()

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

            if (consoleLogs.length > 0) {
                const consoleLogPath = path.join(
                    screenshotDir,
                    `${sanitizedTitle}_console_${timestamp}.json`
                )
                try {
                    fs.writeFileSync(
                        consoleLogPath,
                        JSON.stringify(consoleLogs, null, 2)
                    )
                    await testInfo.attach('console-logs', {
                        path: consoleLogPath,
                        contentType: 'application/json',
                    })
                    console.log(`Console logs saved to: ${consoleLogPath}`)
                } catch (error) {
                    console.error(
                        'Failed to save console logs:',
                        (error as Error).message
                    )
                }
            }

            if (networkLogs.length > 0) {
                const networkLogPath = path.join(
                    screenshotDir,
                    `${sanitizedTitle}_network_${timestamp}.json`
                )
                try {
                    fs.writeFileSync(
                        networkLogPath,
                        JSON.stringify(networkLogs, null, 2)
                    )
                    await testInfo.attach('network-logs', {
                        path: networkLogPath,
                        contentType: 'application/json',
                    })
                    console.log(`Network logs saved to: ${networkLogPath}`)
                } catch (error) {
                    console.error(
                        'Failed to save network logs:',
                        (error as Error).message
                    )
                }
            }

            await captureScreenshot(
                page,
                screenshotDir,
                sanitizedTitle,
                timestamp,
                'main-page',
                testInfo
            )

            for (let i = 0; i < popups.length; i++) {
                await captureScreenshot(
                    popups[i],
                    screenshotDir,
                    sanitizedTitle,
                    timestamp,
                    `popup-${i}`,
                    testInfo
                )
            }
        }
    },
})

export { expect } from '@playwright/test'
