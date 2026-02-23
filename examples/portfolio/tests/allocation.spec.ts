// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { pino } from 'pino'
import { test, expect } from '@playwright/test'
import { OTCTrade } from '@canton-network/core-wallet-test-utils'
import {
    createWalletGateway,
    setupRegistry,
    tap,
    switchWallet,
    gotoDashboard,
} from './utils'

// Extend default 30s because allocation test involves OTC trade setup, multiple taps, and allocations
test.setTimeout(120_000)

test('allocation via OTC trade', async ({ page: dappPage }) => {
    const rnd = Math.floor(Math.random() * 100000)
    const wg = createWalletGateway(dappPage)

    await setupRegistry(dappPage)
    await gotoDashboard(dappPage)
    await wg.connect({ network: 'LocalNet' })

    // Create wallets with unique names
    const venue = await wg.createWalletIfNotExists({
        partyHint: `venue-${rnd}`,
        signingProvider: 'participant',
    })
    const alice = await wg.createWalletIfNotExists({
        partyHint: `alice-${rnd}`,
        signingProvider: 'participant',
    })
    const bob = await wg.createWalletIfNotExists({
        partyHint: `bob-${rnd}`,
        signingProvider: 'participant',
    })

    // Setup OTC trade
    const logger = pino({ name: 'otc-trade', level: 'info' })
    const otcTrade = new OTCTrade({
        logger,
        venue,
        alice,
        bob,
    })
    const otcTradeDetails = await otcTrade.setup()

    // Alice: tap and create allocation
    await wg.setPrimaryWallet(alice)
    await tap(dappPage, wg, '1000')

    // Wait for allocation request to appear in Action Required
    await expect(dappPage.getByText('Action Required')).toBeVisible({
        timeout: 10000,
    })
    await expect(
        dappPage.getByText('Allocation', { exact: true }).first()
    ).toBeVisible()

    // Open allocation dialog
    await dappPage.getByText('Allocation', { exact: true }).first().click()

    // Create allocation via dialog button
    await wg.approveTransaction(() =>
        dappPage
            .getByRole('button', { name: 'Create Allocation' })
            .first()
            .click()
    )
    await dappPage.getByRole('button', { name: 'Close' }).click()

    // Bob: tap and create allocation
    await switchWallet(dappPage, wg, bob)
    await tap(dappPage, wg, '1000')

    // Wait for allocation request to appear
    await expect(dappPage.getByText('Action Required')).toBeVisible({
        timeout: 10000,
    })
    await expect(
        dappPage.getByText('Allocation', { exact: true }).first()
    ).toBeVisible()

    await dappPage.getByText('Allocation', { exact: true }).first().click()
    await wg.approveTransaction(() =>
        dappPage
            .getByRole('button', { name: 'Create Allocation' })
            .first()
            .click()
    )

    await otcTrade.settle(otcTradeDetails)
})
