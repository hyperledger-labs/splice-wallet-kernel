// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { test, expect, Page } from '@playwright/test'

async function setupRegistry(page: Page): Promise<void> {
    await page.getByRole('tab', { name: 'Registry Settings' }).click()
    await page
        .getByRole('textbox', { name: 'url' })
        .fill('http://scan.localhost:4000')
    await page.getByRole('button', { name: 'Add registry' }).click()
    await expect(page.getByText('DSO::')).toBeVisible()
}

async function createWallet(popup: Page, partyHint: string): Promise<void> {
    const walletCard = await popup
        .locator('.wallet-card')
        .filter({ hasText: partyHint })
        .first()
        .elementHandle()

    if (walletCard) return // Wallet already exists

    await popup.getByRole('button', { name: 'Create New' }).click()
    await popup.getByRole('textbox', { name: 'Party ID hint:' }).fill('alice')
    await popup.getByLabel('Signing Provider:').selectOption('participant')
    await popup.getByLabel('Network:').selectOption('canton:localnet')
    await popup.getByRole('button', { name: 'Create' }).click()

    // aliceWalletCard.getByRole('button', { name: 'Set Primary' }).click()
}

test('portfolio: view holdings', async ({ page: dappPage }) => {
    await dappPage.goto('http://localhost:8081/old')

    await expect(dappPage).toHaveTitle(/dApp Portfolio/)

    await setupRegistry(dappPage)

    const connectButton = dappPage.getByRole('button', {
        name: 'connect to Wallet Gateway',
    })
    await expect(connectButton).toBeVisible()

    const discoverPopupPromise = dappPage.waitForEvent('popup')
    await connectButton.click()

    const popup = await discoverPopupPromise

    await popup.getByRole('button', { name: 'Connect' }).click()

    const selectNetwork = popup.locator('select#network')

    const localNetOption = await selectNetwork
        .locator('option')
        .filter({ hasText: 'LocalNet' })
        .first()
        .getAttribute('value')

    await selectNetwork.selectOption(localNetOption)

    await popup.getByRole('button', { name: 'Connect' }).click()

    await createWallet(popup, 'alice')

    await dappPage.getByRole('tab', { name: 'Holdings' }).click()
    const selectTapInstrument = dappPage.getByRole('combobox', {
        className: 'select-instrument',
    })
    const amtOption = await selectTapInstrument
        .locator('option')
        .filter({ hasText: 'AMT' })
        .first()
        .getAttribute('value')
    selectTapInstrument.selectOption(amtOption)
    await dappPage.getByRole('button', { name: 'TAP' }).click()

    await popup.getByRole('button', { name: 'Approve' }).click()
    await expect(
        dappPage.locator('li').filter({ hasText: '10000' }).first()
    ).toBeVisible()
})
