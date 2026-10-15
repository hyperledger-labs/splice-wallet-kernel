// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, type Page, test } from '@playwright/test'
import { OTCTrade } from '@canton-network/core-wallet-test-utils'
import {
    createGatewayApi,
    connectGateway,
    createWalletGateway,
    gotoConnect,
    setupRegistry,
    switchWallet,
    tap,
    tapAndCreateAllocation,
} from './utils'

const BASE_URL = 'http://localhost:8081'
const HISTORY_TIMEOUT = 30_000

type ExpectedHistoryRow = {
    activity: string
    amount: string
    counterpartyHint: string
}

const gotoWalletHistory = async (
    page: Page,
    walletId: string,
    walletHint: string
): Promise<void> => {
    await page.goto(
        `${BASE_URL}/dashboard/wallet/${encodeURIComponent(walletId)}`
    )

    const main = page.locator('main')
    await expect(main.getByRole('heading', { name: walletHint })).toBeVisible({
        timeout: 10_000,
    })
    await expect(
        main.getByRole('table', { name: 'Transaction history' })
    ).toBeVisible({ timeout: HISTORY_TIMEOUT })
}

const expectHistoryRow = async (
    page: Page,
    expected: ExpectedHistoryRow
): Promise<void> => {
    const row = page
        .getByRole('table', { name: 'Transaction history' })
        .getByRole('row')
        .filter({
            has: page.getByRole('cell', {
                name: expected.activity,
                exact: true,
            }),
        })
        .filter({
            has: page.getByRole('cell', {
                name: expected.amount,
                exact: true,
            }),
        })
        .filter({ hasText: expected.counterpartyHint.slice(0, 10) })

    await expect(row).toHaveCount(1, { timeout: HISTORY_TIMEOUT })
}

const setupOtcTrade = async (page: Page) => {
    const rnd = Math.floor(Math.random() * 100000)
    const wg = createWalletGateway(page)

    const venueHint = `venue-${rnd}`
    const aliceHint = `alice-${rnd}`
    const bobHint = `bob-${rnd}`
    const charlieHint = `charlie-${rnd}`

    // Scaffolding: an OTC trade needs four parties and none of them is what
    // this test asserts, so they are created through the wallet's API.
    const api = await createGatewayApi()
    const venue = await api.createWallet({
        partyHint: venueHint,
        signingProvider: 'participant',
    })
    const alice = await api.createWallet({
        partyHint: aliceHint,
        signingProvider: 'participant',
        primary: true,
    })
    const bob = await api.createWallet({
        partyHint: bobHint,
        signingProvider: 'participant',
    })
    const charlie = await api.createWallet({
        partyHint: charlieHint,
        signingProvider: 'participant',
    })

    await gotoConnect(page)
    await connectGateway(page, wg)
    await setupRegistry(page)

    const otcTrade = new OTCTrade({
        venue,
        alice,
        bob,
        charlie,
    })
    const otcTradeDetails = await otcTrade.setup()

    return {
        wg,
        api,
        otcTrade,
        otcTradeDetails,
        alice,
        aliceHint,
        bob,
        bobHint,
        charlie,
        charlieHint,
    }
}

test.describe('OTC allocations', () => {
    // OTC setup includes multiple taps, allocations, and settlement.
    test.setTimeout(180_000)

    test('shows reservations and every settlement leg', async ({
        page: dappPage,
    }) => {
        const {
            wg,
            api,
            otcTrade,
            otcTradeDetails,
            alice,
            aliceHint,
            bob,
            bobHint,
            charlie,
            charlieHint,
        } = await setupOtcTrade(dappPage)

        await tapAndCreateAllocation(dappPage, wg, '1000', 2)

        await switchWallet(api, bob)
        await tapAndCreateAllocation(dappPage, wg, '1000')

        await switchWallet(api, charlie)
        await tapAndCreateAllocation(dappPage, wg, '1000')

        await otcTrade.settle(otcTradeDetails)

        await gotoWalletHistory(dappPage, alice, aliceHint)
        await expectHistoryRow(dappPage, {
            activity: 'Allocation reserved',
            amount: '100',
            counterpartyHint: bobHint,
        })
        await expectHistoryRow(dappPage, {
            activity: 'Allocation reserved',
            amount: '50',
            counterpartyHint: charlieHint,
        })
        await expectHistoryRow(dappPage, {
            activity: 'Transfer sent ↗',
            amount: '-100',
            counterpartyHint: bobHint,
        })
        await expectHistoryRow(dappPage, {
            activity: 'Transfer received ↘',
            amount: '+20',
            counterpartyHint: bobHint,
        })
        await expectHistoryRow(dappPage, {
            activity: 'Transfer sent ↗',
            amount: '-50',
            counterpartyHint: charlieHint,
        })
        await expectHistoryRow(dappPage, {
            activity: 'Transfer received ↘',
            amount: '+80',
            counterpartyHint: charlieHint,
        })

        await gotoWalletHistory(dappPage, bob, bobHint)
        await expectHistoryRow(dappPage, {
            activity: 'Allocation reserved',
            amount: '20',
            counterpartyHint: aliceHint,
        })
        await expectHistoryRow(dappPage, {
            activity: 'Transfer received ↘',
            amount: '+100',
            counterpartyHint: aliceHint,
        })
        await expectHistoryRow(dappPage, {
            activity: 'Transfer sent ↗',
            amount: '-20',
            counterpartyHint: aliceHint,
        })

        await gotoWalletHistory(dappPage, charlie, charlieHint)
        await expectHistoryRow(dappPage, {
            activity: 'Allocation reserved',
            amount: '80',
            counterpartyHint: aliceHint,
        })
        await expectHistoryRow(dappPage, {
            activity: 'Transfer received ↘',
            amount: '+50',
            counterpartyHint: aliceHint,
        })
        await expectHistoryRow(dappPage, {
            activity: 'Transfer sent ↗',
            amount: '-80',
            counterpartyHint: aliceHint,
        })
    })

    test('withdraws an allocation and restores the leg', async ({
        page: dappPage,
    }) => {
        const { wg, alice, aliceHint, bobHint } = await setupOtcTrade(dappPage)

        await tap(dappPage, wg, '1000')

        const allocationRequest = dappPage
            .getByRole('button', { name: 'Open Allocation Request' })
            .first()
        await expect(allocationRequest).toBeVisible({ timeout: 15_000 })
        await allocationRequest.click()

        const dialog = dappPage.getByRole('dialog')
        await expect(
            dialog.getByRole('heading', { name: 'Allocation Request' })
        ).toBeVisible()

        const aliceToBobLeg = dialog.getByRole('group', {
            name: 'Transfer leg 1',
        })
        await expect(
            aliceToBobLeg.getByText('-100 Amulet', { exact: true })
        ).toBeVisible()
        await expect(aliceToBobLeg).toContainText(bobHint.slice(0, 10))

        const allocateButton = aliceToBobLeg.getByRole('button', {
            name: 'Allocate',
        })
        await expect(allocateButton).toHaveClass(/MuiButton-sizeSmall/)

        await wg.approveTransaction(() => allocateButton.click())

        await expect(
            aliceToBobLeg.getByRole('button', { name: 'Withdraw' })
        ).toBeVisible({ timeout: 15_000 })

        await dialog.getByLabel('Close allocation request dialog').click()
        await expect(dialog).not.toBeVisible({ timeout: 10_000 })
        await expect(allocationRequest).toContainText('Partially Allocated', {
            timeout: 15_000,
        })
        await allocationRequest.click()

        const withdrawButton = aliceToBobLeg.getByRole('button', {
            name: 'Withdraw',
        })
        await expect(withdrawButton).toBeVisible({ timeout: 15_000 })
        await expect(withdrawButton).toHaveClass(/MuiButton-sizeSmall/)
        await expect(withdrawButton).toHaveClass(/MuiButton-colorSecondary/)
        await wg.approveTransaction(() => withdrawButton.click())

        await expect(
            aliceToBobLeg.getByRole('button', { name: 'Allocate' })
        ).toBeVisible({ timeout: 15_000 })
        await expect(withdrawButton).not.toBeVisible()

        await dialog.getByLabel('Close allocation request dialog').click()
        await expect(dialog).not.toBeVisible({ timeout: 10_000 })

        await gotoWalletHistory(dappPage, alice, aliceHint)
        await expectHistoryRow(dappPage, {
            activity: 'Allocation reserved',
            amount: '100',
            counterpartyHint: bobHint,
        })
        await expectHistoryRow(dappPage, {
            activity: 'Allocation withdrawn',
            amount: '100',
            counterpartyHint: 'Self',
        })
    })
})
