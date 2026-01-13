// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { test, expect, Page } from '@playwright/test'

async function connectToLocalNet(dappPage: Page): Promise<Page> {
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
    return popup
}

async function createWallet(popup: Page, partyHint: string): Promise<void> {
    await popup.getByRole('button', { name: 'Toggle menu' }).click()
    await popup.getByRole('button', { name: 'Wallets' }).click()

    await expect(popup.getByText('Loading wallets…')).not.toBeVisible();

    const walletCards = popup
        .locator('.wallet-card')
        .filter({ hasText: `${partyHint}::` })

    const walletCardsCount = await walletCards.count()
    if (walletCardsCount > 0) return // Wallet already exists

    await popup.getByRole('button', { name: 'Create New' }).click()
    await popup.getByRole('textbox', { name: 'Party ID hint:' }).fill('alice')
    await popup.getByLabel('Signing Provider:').selectOption('participant')
    await popup.getByLabel('Network:').selectOption('canton:localnet')
    await popup.getByRole('button', { name: 'Create' }).click()
    await popup.getByRole('button', { name: 'Close' }).click()
}

async function setupRegistry(page: Page): Promise<void> {
    await page.getByRole('tab', { name: 'Registry Settings' }).click()
    await page
        .getByRole('textbox', { name: 'url' })
        .fill('http://scan.localhost:4000')
    await page.getByRole('button', { name: 'Add registry' }).click()
    await expect(page.getByText('DSO::')).toBeVisible()
}

test('portfolio: tap', async ({ page: dappPage }) => {
    await dappPage.goto('http://localhost:8081/old')
    await expect(dappPage).toHaveTitle(/dApp Portfolio/)

    const popup = await connectToLocalNet(dappPage)
    await createWallet(popup, 'alice')
    await setupRegistry(dappPage)

    await dappPage.getByRole('tab', { name: 'Holdings' }).click()
    const tapForm = await dappPage.locator('form.tap')
    const selectTapInstrument = tapForm.getByRole('combobox', {
        className: 'select-instrument',
    })
    const amtOption = await selectTapInstrument
        .locator('option')
        .filter({ hasText: 'AMT' })
        .first()
        .getAttribute('value')
    selectTapInstrument.selectOption(amtOption)
    await tapForm.getByRole('spinbutton').fill('1234')
    await dappPage.getByRole('button', { name: 'TAP' }).click()

    await popup.getByRole('button', { name: 'Approve' }).click()
    await expect(
        dappPage.locator('li').filter({ hasText: '1234' })
    ).not.toHaveCount(0)  // Use not.toHaveCount to help successive tests.
})
