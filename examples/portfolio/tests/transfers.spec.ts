// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { test, expect, type Page } from '@playwright/test'
import type {
    GatewayUserApi,
    WalletGateway,
} from '@canton-network/core-wallet-test-utils'
import {
    createGatewayApi,
    connectGateway,
    createWalletGateway,
    expectOffersBadgeCount,
    expectTransferOfferGone,
    expectWalletBalance,
    expectWalletHasNoAssets,
    fillAndSubmitTransfer,
    gotoConnect,
    gotoDashboard,
    gotoOffers,
    openTransferDialog,
    openTransferOfferDialog,
    setupRegistry,
    switchWallet,
    tap,
} from './utils'

// Transfer tests involve multiple ledger transactions (tap + transfer + accept/reject/withdraw),
// so give them more time than the default 30s.
test.setTimeout(120_000)

interface TransferTestContext {
    wg: WalletGateway
    api: GatewayUserApi
    alice: string
    bob: string
}

const setupTransferTest = async (page: Page): Promise<TransferTestContext> => {
    const rnd = Math.floor(Math.random() * 100000)
    const wg = createWalletGateway(page)

    // Wallets are scaffolding here, so they are created through the wallet's
    // API. They exist before the dApp connects, so the dashboard already opens
    // on alice.
    const api = await createGatewayApi()
    const alice = await api.createWallet({
        partyHint: `alice-${rnd}`,
        signingProvider: 'participant',
        primary: true,
    })
    const bob = await api.createWallet({
        partyHint: `bob-${rnd}`,
        signingProvider: 'participant',
    })

    await gotoConnect(page)
    await connectGateway(page, wg)

    await setupRegistry(page)
    await gotoDashboard(page)

    return { wg, api, alice, bob }
}

test.describe('dashboard transfer flow', () => {
    test('rejected approval returns the transfer form to a recoverable state', async ({
        page: dappPage,
    }) => {
        const { wg, bob } = await setupTransferTest(dappPage)

        await tap(dappPage, wg, '200')
        await openTransferDialog(dappPage)

        const dialog = dappPage.getByRole('dialog')
        await dialog
            .getByRole('textbox', { name: 'Recipient Address' })
            .fill(bob)
        await dialog.getByRole('combobox', { name: 'Select asset' }).click()
        await dappPage.getByRole('option', { name: /AMT/ }).click()
        await dialog.getByRole('spinbutton', { name: 'Amount' }).fill('25')
        await dialog
            .getByRole('textbox', { name: 'Description' })
            .fill(`rejected approval test ${Date.now()}`)

        const submitButton = dialog.getByRole('button', {
            name: 'Make Transfer',
        })
        await wg.rejectTransaction(() => submitButton.click())

        await expect(dialog.getByRole('alert')).toContainText(
            /Transfer failed: Transaction with commandId \S+ failed to execute\./,
            { timeout: 15000 }
        )
        await expect(
            dialog.getByRole('heading', { name: 'Transfer Summary' })
        ).not.toBeVisible()
        await expect(
            dialog.getByRole('button', { name: 'Close transfer dialog' })
        ).toBeEnabled()
        await expect(submitButton).toBeEnabled()

        await wg.approveTransaction(() => submitButton.click())
        await expect(
            dialog.getByRole('heading', { name: 'Transfer Summary' })
        ).toBeVisible({ timeout: 15000 })
    })

    test('two step transfer - accept', async ({ page: dappPage }) => {
        const { wg, api, alice, bob } = await setupTransferTest(dappPage)

        // Alice: tap and create transfer.
        await tap(dappPage, wg, '1234')

        // Verify alice's holdings on the wallet detail page.
        await expectWalletBalance(dappPage, alice, '1234')

        const message = 'accept transfer test ' + Date.now()
        await gotoDashboard(dappPage)

        // No offers yet, so the sidebar badge is hidden.
        await expectOffersBadgeCount(dappPage, 0)

        await openTransferDialog(dappPage)
        await fillAndSubmitTransfer(dappPage, wg, {
            amount: '321',
            recipient: bob,
            message,
        })

        // Alice's outgoing offer is counted on the sidebar badge.
        await expectOffersBadgeCount(dappPage, 1)

        // Switch to bob to see the pending transfer as receiver.
        await switchWallet(api, bob)
        await gotoDashboard(dappPage)

        // Bob's incoming offer is counted on the sidebar badge.
        await expectOffersBadgeCount(dappPage, 1)

        const dialog = await openTransferOfferDialog(dappPage, {
            amount: '321',
            message,
        })

        await wg.approveTransaction(() =>
            dialog.getByRole('button', { name: 'Accept' }).click()
        )

        // Verify bob received the transferred amount.
        await expectWalletBalance(dappPage, bob, '321')

        // The accepted offer no longer counts towards the badge.
        await expectOffersBadgeCount(dappPage, 0)

        // Verify alice's balance decreased.
        await switchWallet(api, alice)
        await expectWalletBalance(dappPage, alice, '913')
    })

    test('two step transfer - rejection', async ({ page: dappPage }) => {
        const { wg, api, alice, bob } = await setupTransferTest(dappPage)

        // Alice: tap and create transfer.
        await tap(dappPage, wg, '500')

        const message = 'reject transfer test ' + Date.now()
        await openTransferDialog(dappPage)
        await fillAndSubmitTransfer(dappPage, wg, {
            amount: '100',
            recipient: bob,
            message,
        })

        // Switch to bob to see the pending transfer as receiver.
        await switchWallet(api, bob)
        await gotoDashboard(dappPage)

        const dialog = await openTransferOfferDialog(dappPage, {
            amount: '100',
            message,
        })

        await wg.approveTransaction(() =>
            dialog.getByRole('button', { name: 'Reject' }).click()
        )

        // Reload dashboard and verify the rejected transfer is gone.
        await gotoDashboard(dappPage)
        await expectTransferOfferGone(dappPage, { amount: '100', message })

        // Verify alice's balance is restored after rejection.
        await switchWallet(api, alice)
        await expectWalletBalance(dappPage, alice, '500')

        // Verify bob has no holdings.
        await switchWallet(api, bob)
        await expectWalletHasNoAssets(dappPage, bob)
    })

    test('two step transfer - withdrawal by sender', async ({
        page: dappPage,
    }) => {
        const { wg, api, alice, bob } = await setupTransferTest(dappPage)

        // Alice: tap and create transfer.
        await tap(dappPage, wg, '500')

        const message = 'withdraw transfer test ' + Date.now()
        await openTransferDialog(dappPage)
        await fillAndSubmitTransfer(dappPage, wg, {
            amount: '100',
            recipient: bob,
            message,
        })

        // Re-assert alice as primary wallet and wait for the outgoing transfer
        // to load on Offers.
        await switchWallet(api, alice)
        await gotoOffers(dappPage)
        const loadedDialog = await openTransferOfferDialog(dappPage, {
            amount: '100',
            message,
        })
        await loadedDialog.getByLabel('Close transfer offer dialog').click()

        // Outgoing transfers do not appear as actions required on the dashboard.
        await gotoDashboard(dappPage)
        await expectTransferOfferGone(dappPage, { amount: '100', message })

        // The transfer remains available on Offers so the sender can withdraw it.
        await gotoOffers(dappPage)
        const dialog = await openTransferOfferDialog(dappPage, {
            amount: '100',
            message,
        })

        await wg.approveTransaction(() =>
            dialog.getByRole('button', { name: 'Withdraw' }).click()
        )

        // Verify the transfer is gone from Offers.
        await gotoOffers(dappPage)
        await expectTransferOfferGone(dappPage, { amount: '100', message })

        // Verify alice's balance is restored after withdrawal.
        await expectWalletBalance(dappPage, alice, '500')

        // Verify bob has no holdings.
        await switchWallet(api, bob)
        await expectWalletHasNoAssets(dappPage, bob)
    })

    test('transfer detail dialog', async ({ page: dappPage }) => {
        const { wg, api, bob } = await setupTransferTest(dappPage)

        // Alice: tap and create transfer.
        await tap(dappPage, wg, '800')

        const message = 'dialog detail test ' + Date.now()
        await openTransferDialog(dappPage)
        await fillAndSubmitTransfer(dappPage, wg, {
            amount: '200',
            recipient: bob,
            message,
        })

        // Switch to bob (receiver) to see the transfer.
        await switchWallet(api, bob)
        await gotoDashboard(dappPage)

        const dialog = await openTransferOfferDialog(dappPage, {
            amount: '200',
            message,
        })

        // Verify the Transfer Offer dialog.
        await expect(
            dialog.getByRole('heading', { name: 'Transfer Offer' })
        ).toBeVisible()
        await expect(dialog.getByText(/[+-]200\b/)).toBeVisible()
        await expect(dialog.getByText(message)).toBeVisible()

        // Verify dialog has Accept and Reject buttons.
        await expect(
            dialog.getByRole('button', { name: 'Accept' })
        ).toBeVisible()
        await expect(
            dialog.getByRole('button', { name: 'Reject' })
        ).toBeVisible()

        // Accept via the dialog.
        await wg.approveTransaction(() =>
            dialog.getByRole('button', { name: 'Accept' }).click()
        )
    })
})
