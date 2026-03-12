// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { test, expect } from '@playwright/test'
import {
    createWalletGateway,
    setupRegistry,
    tap,
    openTransferDialog,
    fillAndSubmitTransfer,
    switchWallet,
    gotoDashboard,
} from './utils'

// Transfer tests share wallet gateway state (primary wallet) with the backend,
// so they must run serially to avoid races on which wallet is primary.
test.describe.configure({ mode: 'serial' })

// Transfer tests involve multiple ledger transactions (tap + transfer + accept/reject/withdraw),
// so give them more time than the default 30s.
test.setTimeout(120_000)

test('two step transfer - accept', async ({ page: dappPage }) => {
    const rnd = Math.floor(Math.random() * 100000)
    const wg = createWalletGateway(dappPage)

    await setupRegistry(dappPage)
    await gotoDashboard(dappPage)
    await wg.connect({ network: 'LocalNet' })

    const alice = await wg.createWalletIfNotExists({
        partyHint: `alice-${rnd}`,
        signingProvider: 'participant',
    })
    const bob = await wg.createWalletIfNotExists({
        partyHint: `bob-${rnd}`,
        signingProvider: 'participant',
    })

    // Alice: tap and create transfer
    await wg.setPrimaryWallet(alice)
    await tap(dappPage, wg, '1234')

    // Verify alice's holdings on dashboard
    const aliceWallet = dappPage.getByTestId(`wallet-preview-${alice}`)
    const aliceAmt = aliceWallet.getByTestId('instrument-row-AMT')
    await expect(aliceAmt).toBeVisible({ timeout: 25000 })
    await expect(aliceAmt.getByTestId('instrument-total-amount')).toContainText(
        '1234'
    )

    const message = 'accept transfer test ' + Date.now()
    await openTransferDialog(dappPage)
    await fillAndSubmitTransfer(dappPage, wg, {
        amount: '321',
        recipient: bob,
        message,
    })

    // Switch to bob to see the pending transfer as receiver
    await switchWallet(dappPage, wg, bob)
    await gotoDashboard(dappPage)

    // Wait for the transfer to appear in Action Required
    await expect(dappPage.getByText(message.slice(0, 20)).first()).toBeVisible({
        timeout: 15000,
    })

    await wg.approveTransaction(() =>
        dappPage.getByRole('button', { name: 'Accept' }).first().click()
    )

    // Verify bob received the transferred amount
    await gotoDashboard(dappPage)
    const bobWallet = dappPage.getByTestId(`wallet-preview-${bob}`)
    const bobAmt = bobWallet.getByTestId('instrument-row-AMT')
    await expect(bobAmt).toBeVisible({ timeout: 15000 })
    await expect(bobAmt.getByTestId('instrument-total-amount')).toContainText(
        '321'
    )

    // Verify alice's balance decreased
    await switchWallet(dappPage, wg, alice)
    await gotoDashboard(dappPage)
    const aliceWalletAfter = dappPage.getByTestId(`wallet-preview-${alice}`)
    const aliceAmtAfter = aliceWalletAfter.getByTestId('instrument-row-AMT')
    await expect(aliceAmtAfter).toBeVisible({ timeout: 15000 })
    await expect(
        aliceAmtAfter.getByTestId('instrument-total-amount')
    ).toContainText('913')
})

test('two step transfer - rejection', async ({ page: dappPage }) => {
    const rnd = Math.floor(Math.random() * 100000)
    const wg = createWalletGateway(dappPage)

    await setupRegistry(dappPage)
    await gotoDashboard(dappPage)
    await wg.connect({ network: 'LocalNet' })

    const alice = await wg.createWalletIfNotExists({
        partyHint: `alice-${rnd}`,
        signingProvider: 'participant',
    })
    const bob = await wg.createWalletIfNotExists({
        partyHint: `bob-${rnd}`,
        signingProvider: 'participant',
    })

    // Alice: tap and create transfer
    await wg.setPrimaryWallet(alice)
    await tap(dappPage, wg, '500')

    const message = 'reject transfer test ' + Date.now()
    await openTransferDialog(dappPage)
    await fillAndSubmitTransfer(dappPage, wg, {
        amount: '100',
        recipient: bob,
        message,
    })

    // Switch to bob to see the pending transfer as receiver
    await switchWallet(dappPage, wg, bob)
    await gotoDashboard(dappPage)

    // Wait for the transfer to appear in Action Required
    await expect(dappPage.getByText(message.slice(0, 20)).first()).toBeVisible({
        timeout: 15000,
    })

    await wg.approveTransaction(() =>
        dappPage.getByRole('button', { name: 'Reject' }).first().click()
    )

    // Reload dashboard and verify the rejected transfer is gone
    await gotoDashboard(dappPage)
    await expect(dappPage.getByText(message.slice(0, 20))).not.toBeVisible({
        timeout: 15000,
    })

    // Verify alice's balance is restored after rejection
    await switchWallet(dappPage, wg, alice)
    await gotoDashboard(dappPage)
    const aliceWallet = dappPage.getByTestId(`wallet-preview-${alice}`)
    const aliceAmt = aliceWallet.getByTestId('instrument-row-AMT')
    await expect(aliceAmt).toBeVisible({ timeout: 15000 })
    await expect(aliceAmt.getByTestId('instrument-total-amount')).toContainText(
        '500'
    )

    // Verify bob has no holdings (transfer was rejected)
    const bobWallet = dappPage.getByTestId(`wallet-preview-${bob}`)
    await expect(bobWallet.getByTestId('instrument-row-AMT')).not.toBeVisible()
})

test('two step transfer - withdrawal by sender', async ({ page: dappPage }) => {
    const rnd = Math.floor(Math.random() * 100000)
    const wg = createWalletGateway(dappPage)

    await setupRegistry(dappPage)
    await gotoDashboard(dappPage)
    await wg.connect({ network: 'LocalNet' })

    const alice = await wg.createWalletIfNotExists({
        partyHint: `alice-${rnd}`,
        signingProvider: 'participant',
    })
    const bob = await wg.createWalletIfNotExists({
        partyHint: `bob-${rnd}`,
        signingProvider: 'participant',
    })

    // Alice: tap and create transfer
    await wg.setPrimaryWallet(alice)
    await tap(dappPage, wg, '500')

    const message = 'withdraw transfer test ' + Date.now()
    await openTransferDialog(dappPage)
    await fillAndSubmitTransfer(dappPage, wg, {
        amount: '100',
        recipient: bob,
        message,
    })

    // Re-assert alice as primary wallet so the dashboard shows her perspective
    // (sender sees a "Withdraw" button for their outgoing transfers).
    await switchWallet(dappPage, wg, alice)
    await gotoDashboard(dappPage)

    // Wait for the transfer to appear in Action Required (alice is sender)
    await expect(dappPage.getByText(message.slice(0, 20)).first()).toBeVisible({
        timeout: 15000,
    })

    await wg.approveTransaction(() =>
        dappPage.getByRole('button', { name: 'Withdraw' }).first().click()
    )

    // Verify the transfer is gone
    await gotoDashboard(dappPage)
    await expect(dappPage.getByText(message.slice(0, 20))).not.toBeVisible({
        timeout: 15000,
    })

    // Verify alice's balance is restored after withdrawal
    const aliceWallet = dappPage.getByTestId(`wallet-preview-${alice}`)
    const aliceAmt = aliceWallet.getByTestId('instrument-row-AMT')
    await expect(aliceAmt).toBeVisible({ timeout: 15000 })
    await expect(aliceAmt.getByTestId('instrument-total-amount')).toContainText(
        '500'
    )

    // Verify bob has no holdings (transfer was withdrawn)
    const bobWallet = dappPage.getByTestId(`wallet-preview-${bob}`)
    await expect(bobWallet.getByTestId('instrument-row-AMT')).not.toBeVisible()
})

test('transfer detail dialog', async ({ page: dappPage }) => {
    const rnd = Math.floor(Math.random() * 100000)
    const wg = createWalletGateway(dappPage)

    await setupRegistry(dappPage)
    await gotoDashboard(dappPage)
    await wg.connect({ network: 'LocalNet' })

    const alice = await wg.createWalletIfNotExists({
        partyHint: `alice-${rnd}`,
        signingProvider: 'participant',
    })
    const bob = await wg.createWalletIfNotExists({
        partyHint: `bob-${rnd}`,
        signingProvider: 'participant',
    })

    // Alice: tap and create transfer
    await wg.setPrimaryWallet(alice)
    await tap(dappPage, wg, '800')

    const message = 'dialog detail test ' + Date.now()
    await openTransferDialog(dappPage)
    await fillAndSubmitTransfer(dappPage, wg, {
        amount: '200',
        recipient: bob,
        message,
    })

    // Switch to bob (receiver) to see the transfer
    await switchWallet(dappPage, wg, bob)

    // Reload dashboard to pick up data
    await gotoDashboard(dappPage)

    // Wait for the transfer to appear, then click to open dialog
    await expect(dappPage.getByText(message.slice(0, 20)).first()).toBeVisible({
        timeout: 15000,
    })
    await dappPage.getByText(message.slice(0, 20)).first().click()

    // Verify the Transfer Details dialog
    const dialog = dappPage.getByRole('dialog')
    await expect(
        dialog.getByRole('heading', { name: 'Transfer Details' })
    ).toBeVisible()
    await expect(dialog.getByText('Transfer Offer')).toBeVisible()
    // Amount is formatted as "200.0000000000 Amulet" - scope to dialog to avoid
    // matching the action item card behind it
    await expect(dialog.getByText(/200.*Amulet/)).toBeVisible()
    await expect(dialog.getByText(message)).toBeVisible()

    // Verify dialog has Accept and Reject buttons
    await expect(dialog.getByRole('button', { name: 'Accept' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Reject' })).toBeVisible()

    // Accept via the dialog
    await wg.approveTransaction(() =>
        dialog.getByRole('button', { name: 'Accept' }).click()
    )
})
