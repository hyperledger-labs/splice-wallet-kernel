// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { test, expect, Page } from '@playwright/test'

const connectToLocalNet = async (dappPage: Page): Promise<Page> => {
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

const setPrimaryWallet = async (
    popup: Page,
    partyId: string
): Promise<void> => {
    // Make sure we're on the right page.
    await popup.getByRole('button', { name: 'Toggle menu' }).click()
    await popup.getByRole('button', { name: 'Wallets' }).click()
    await expect(popup.getByText('Loading wallets…')).not.toBeVisible()

    // Check for existing user with that party hint.
    const wallet = popup
        .locator('.wallet-card')
        .filter({ hasText: partyId })
        .first()
    await wallet.getByRole('button', { name: 'Set Primary' }).click()
}

const createWalletIfNotExists = async (
    popup: Page,
    partyHint: string
): Promise<string> => {
    // Make sure we're on the right page.
    await popup.getByRole('button', { name: 'Toggle menu' }).click()
    await popup.getByRole('button', { name: 'Wallets' }).click()
    await expect(popup.getByText('Loading wallets…')).not.toBeVisible()

    // Check for existing user with that party hint.
    const pattern = new RegExp(`${partyHint}::[0-9a-f]+`)
    const wallets = popup.getByText(pattern)
    const walletsCount = await wallets.count()
    if (walletsCount > 0) {
        const partyId = (await wallets.first().innerText()).match(pattern)?.[0]
        if (partyId === undefined) {
            throw new Error(`did not find partyID for ${partyHint}`)
        }
        return partyId
    }

    // Create if necessary.
    await popup.getByRole('button', { name: 'Create New' }).click()
    await popup.getByRole('textbox', { name: 'Party ID hint:' }).fill(partyHint)
    await popup.getByLabel('Signing Provider:').selectOption('participant')
    await popup.getByRole('button', { name: 'Create' }).click()
    await popup.getByRole('button', { name: 'Close' }).click()

    const partyId = (await popup.getByText(pattern).first().innerText()).match(
        pattern
    )?.[0]
    if (partyId === undefined) {
        throw new Error(`did not find partyID for ${partyHint}`)
    }
    return partyId
}

const openTab = (
    page: Page,
    tab:
        | 'Holdings'
        | 'Transfer'
        | 'Pending Transfers'
        | 'Transaction History'
        | 'Registry Settings'
): Promise<void> => page.getByRole('tab', { name: tab, exact: true }).click()

const setupRegistry = async (page: Page): Promise<void> => {
    await openTab(page, 'Registry Settings')
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
    const alice = await createWalletIfNotExists(popup, 'alice')
    console.log('aliceParty', alice)
    const bob = await createWalletIfNotExists(popup, 'bob')
    console.log('bobParty', bob)

    await setupRegistry(dappPage)

    await setPrimaryWallet(popup, alice)
    await openTab(dappPage, 'Holdings')
    const tapForm = dappPage.locator('form.tap')
    const selectTapInstrument = tapForm.getByRole('combobox')
    let amtOption = await selectTapInstrument
        .locator('option')
        .filter({ hasText: 'AMT' })
        .first()
        .getAttribute('value')
    selectTapInstrument.selectOption(amtOption)
    await tapForm.getByRole('spinbutton').fill('1234')
    await dappPage.getByRole('button', { name: 'TAP' }).click()

    await popup.getByRole('button', { name: 'Approve' }).click()
    await expect(popup.getByText("Transaction executed successfully")).toBeVisible()
    await expect(
        dappPage.locator('li').filter({ hasText: '1234' })
    ).not.toHaveCount(0) // Use not.toHaveCount to help successive tests.

    const message = 'here ya go poor sod'
    await openTab(dappPage, 'Transfer')
    const transferForm = dappPage.locator('form')
    const selectInstrument = transferForm.getByRole('combobox')
    amtOption = await selectInstrument
        .locator('option')
        .filter({ hasText: 'AMT' })
        .first()
        .getAttribute('value')
    selectInstrument.selectOption(amtOption)
    await transferForm.getByRole('spinbutton').fill('321')
    await transferForm
        .getByRole('textbox', { name: 'Receiver:', exact: true })
        .fill(bob)
    await transferForm.getByLabel('Message').fill(message)

    await dappPage.getByRole('button', { name: 'Transfer' }).click()
    await popup.getByRole('button', { name: 'Approve' }).click()
    await expect(popup.getByText("Transaction executed successfully")).toBeVisible()
    await openTab(dappPage, 'Pending Transfers')
    await expect(dappPage.getByText(message)).not.toHaveCount(0)
    await expect(
        dappPage.getByText('TransferPendingReceiverAcceptance')
    ).not.toHaveCount(0)

    await setPrimaryWallet(popup, bob)
    await dappPage.getByRole('button', { name: 'Accept' }).first().click()
    await popup.getByRole('button', { name: 'Approve' }).click()
    await expect(popup.getByText("Transaction executed successfully")).toBeVisible()
    await openTab(dappPage, 'Transaction History')
    await expect(dappPage.getByText('Completed')).not.toHaveCount(0)
    await expect(dappPage.getByText(message)).not.toHaveCount(0)
})
