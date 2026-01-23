// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { pino } from 'pino'
import { test, expect, Page } from '@playwright/test'
import { WalletGateway, OTCTrade } from '@canton-network/core-wallet-test-utils'

const openTab = (
    page: Page,
    tab:
        | 'Holdings'
        | 'Transfer'
        | 'Pending Transfers'
        | 'Transaction History'
        | 'Registry Settings'
        | 'Allocations'
): Promise<void> => page.getByRole('tab', { name: tab, exact: true }).click()

const setupRegistry = async (page: Page): Promise<void> => {
    await openTab(page, 'Registry Settings')
    await page
        .getByRole('textbox', { name: 'url' })
        .fill('http://scan.localhost:4000')
    await page.getByRole('button', { name: 'Add registry' }).click()
    await expect(page.getByText('DSO::')).toBeVisible()
}

const tap = async (
    dappPage: Page,
    wg: WalletGateway,
    amount: string
): Promise<void> => {
    await openTab(dappPage, 'Holdings')
    const tapForm = dappPage.locator('form.tap')
    const selectTapInstrument = tapForm.getByRole('combobox')
    const amtOption = await selectTapInstrument
        .locator('option')
        .filter({ hasText: 'AMT' })
        .first()
        .getAttribute('value')
    selectTapInstrument.selectOption(amtOption)
    await tapForm.getByRole('spinbutton').fill(amount)
    await wg.approveTransaction(() =>
        dappPage.getByRole('button', { name: 'TAP' }).click()
    )
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

    await wg.connect({ network: 'LocalNet' })
    const alice = await wg.createWalletIfNotExists({
        partyHint: 'alice',
        signingProvider: 'participant',
    })
    console.log('aliceParty', alice)
    const bob = await wg.createWalletIfNotExists({
        partyHint: 'bob',
        signingProvider: 'participant',
    })
    console.log('bobParty', bob)

    await wg.setPrimaryWallet(alice)
    tap(dappPage, wg, '1234')
    await expect(
        dappPage.locator('li').filter({ hasText: '1234' })
    ).not.toHaveCount(0) // Use not.toHaveCount to help successive tests.

    const message = 'here ya go poor sod'
    await openTab(dappPage, 'Transfer')
    const transferForm = dappPage.locator('form')
    const selectInstrument = transferForm.getByRole('combobox')
    const amtOption = await selectInstrument
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

    await wg.approveTransaction(() =>
        dappPage.getByRole('button', { name: 'Transfer' }).click()
    )
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
    await wg.approveTransaction(() =>
        dappPage.getByRole('button', { name: 'Accept' }).first().click()
    )
    await openTab(dappPage, 'Transaction History')
    await expect(dappPage.getByText('Completed')).not.toHaveCount(0)
    await expect(dappPage.getByText(message)).not.toHaveCount(0)
})

test('allocation', async ({ page: dappPage }) => {
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

    await wg.connect({ network: 'LocalNet' })
    const venue = await wg.createWalletIfNotExists({
        partyHint: 'venue',
        signingProvider: 'participant',
    })
    const alice = await wg.createWalletIfNotExists({
        partyHint: 'alice',
        signingProvider: 'participant',
    })
    const bob = await wg.createWalletIfNotExists({
        partyHint: 'bob',
        signingProvider: 'participant',
    })

    const logger = pino({ name: 'otc-trade', level: 'info' })
    const otcTrade = new OTCTrade({
        logger,
        venue,
        alice,
        bob,
    })
    const otcTradeDetails = await otcTrade.setup()

    await wg.setPrimaryWallet(alice)
    await tap(dappPage, wg, '1000')
    await openTab(dappPage, 'Allocations')
    await wg.approveTransaction(() =>
        dappPage
            .getByRole('button', { name: 'Create Allocation' })
            .first()
            .click()
    )

    await wg.setPrimaryWallet(bob)
    await tap(dappPage, wg, '1000')
    await openTab(dappPage, 'Allocations')
    await wg.approveTransaction(() =>
        dappPage
            .getByRole('button', { name: 'Create Allocation' })
            .first()
            .click()
    )

    await otcTrade.settle(otcTradeDetails)
})
