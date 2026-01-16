// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { test, expect, Page } from '@playwright/test'
import { WalletGateway } from '@canton-network/core-wallet-test-utils'

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

test('two step transfer', async ({ page: dappPage }) => {
    const wg = new WalletGateway({
        dappPage,
        openButton: (page) =>
            page.getByRole('button', {
                name: 'open Wallet Gateway',
            }),
        connectButton: (page) =>
            page.getByRole('button', {
                name: 'connect to Wallet Gateway',
            }),
    })
    await dappPage.goto('http://localhost:8081/old')
    await expect(dappPage).toHaveTitle(/dApp Portfolio/)

    await setupRegistry(dappPage)

    await wg.connectToLocalNet()
    const alice = await wg.createWalletIfNotExists('alice')
    console.log('aliceParty', alice)
    const bob = await wg.createWalletIfNotExists('bob')
    console.log('bobParty', bob)

    await wg.setPrimaryWallet(alice)
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

    await wg.approveTransaction()
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
    await wg.approveTransaction()
    await openTab(dappPage, 'Pending Transfers')
    await expect(dappPage.getByText(message)).not.toHaveCount(0)
    await expect(
        dappPage.getByText('TransferPendingReceiverAcceptance')
    ).not.toHaveCount(0)

    const openButton = dappPage.getByRole('button', {
        name: 'open Wallet Gateway',
    })
    await expect(openButton).toBeVisible()
    await openButton.click()

    await wg.setPrimaryWallet(bob)
    await dappPage.getByRole('button', { name: 'Accept' }).first().click()
    await wg.approveTransaction()
    await openTab(dappPage, 'Transaction History')
    await expect(dappPage.getByText('Completed')).not.toHaveCount(0)
    await expect(dappPage.getByText(message)).not.toHaveCount(0)
})
