// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { test, expect, BrowserContext, Page } from '@playwright/test'

const dappApiPort = 3030

async function findPopupByContent(
    context: BrowserContext,
    text: RegExp | string,
    timeout = 5000
): Promise<Page> {
    const start = Date.now()

    while (Date.now() - start < timeout) {
        for (const page of context.pages()) {
            try {
                if (await page.getByText(text).isVisible({ timeout: 500 })) {
                    return page
                }
            } catch {
                // Page not ready / not matching yet
            }
        }
        await new Promise((r) => setTimeout(r, 100))
    }

    throw new Error(`Popup containing ${text} not found`)
}

test('dApp: execute externally signed tx', async ({ page: dappPage }) => {
    await dappPage.goto('http://localhost:8080/')

    // Expect a title "to contain" a substring.
    await expect(dappPage).toHaveTitle(/Example dApp/)

    const connectButton = dappPage.getByRole('button', {
        name: 'connect to Wallet Gateway',
    })
    await expect(connectButton).toBeVisible()

    const discoverPopupPromise = dappPage.waitForEvent('popup')
    await connectButton.click()

    const popup = await discoverPopupPromise

    await popup.getByRole('listitem').filter({ hasText: 'Custom url' }).click()

    // Connect to remote Wallet Gateway
    await popup
        .getByRole('textbox', { name: 'RPC URL' })
        .fill(`http://localhost:${dappApiPort}/api/v0/dapp`)

    await popup.getByRole('button', { name: 'Connect' }).click()

    try {
        await popup.getByRole('button', { name: 'Connect' }).click()

        await expect(dappPage.getByText('Loading...')).toHaveCount(0)

        await expect(dappPage.getByText(/.*connected: 🟢*/)).toBeVisible()

        const party1 = `test-${Date.now()}`
        const party2 = `test-${Date.now() + 1}`

        // Create a participant party named `test1`
        await popup.getByRole('button', { name: 'Create New' }).click()

        await popup.getByRole('textbox', { name: 'Party ID hint:' }).click()
        await popup
            .getByRole('textbox', { name: 'Party ID hint:' })
            .fill(party1)
        await popup.getByLabel('Signing Provider:').selectOption('participant')
        await popup.getByLabel('Network:').selectOption('canton:local-oauth')

        await popup.getByRole('button', { name: 'Create' }).click()

        // Create a kernel party named `test2`
        await popup.getByRole('textbox', { name: 'Party ID hint:' }).click()
        await popup
            .getByRole('textbox', { name: 'Party ID hint:' })
            .fill(party2)
        await popup
            .getByLabel('Signing Provider:')
            .selectOption('wallet-kernel')

        await popup.getByRole('checkbox', { name: 'primary' }).check()
        await popup.getByRole('button', { name: 'Create' }).click()

        // Wait for parties to be allocated
        await expect(popup.getByText(party1)).toHaveCount(2)
        await expect(popup.getByText(party2)).toHaveCount(2)

        //TODO: figure out why we need to reload the page
        await dappPage.reload()

        await expect(
            dappPage.getByText(new RegExp(`${party2}::.*`))
        ).toBeVisible()
        await expect(
            dappPage.getByRole('button', { name: 'create Ping contract' })
        ).toBeEnabled()

        // Create a Ping contract through the dapp with the new party
        await dappPage
            .getByRole('button', { name: 'create Ping contract' })
            .click()

        const transactionPopup = await findPopupByContent(
            dappPage.context(),
            /Pending Transaction Request/
        )

        const id = new URL(transactionPopup.url()).searchParams.get('commandId')

        await transactionPopup.getByRole('button', { name: 'Approve' }).click()

        // Wait for command to have fully executed
        await expect(dappPage.getByText(id || '')).toHaveCount(3)
    } catch (e) {
        try {
            await dappPage.screenshot({
                path: './test-results/error-dapp.png',
            })
            await popup.screenshot({ path: './test-results/error-wk.png' })
        } catch {
            // Ignore errors during screenshot capture
        }
        throw e
    }
})
