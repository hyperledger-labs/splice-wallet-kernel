// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { test, expect } from '@playwright/test'
import { createWalletGateway, setupRegistry, tap, gotoDashboard } from './utils'

test('wallet detail page - holdings and transaction history', async ({
    page: dappPage,
}) => {
    const rnd = Math.floor(Math.random() * 100000)
    const wg = createWalletGateway(dappPage)

    await setupRegistry(dappPage)
    await gotoDashboard(dappPage)
    await wg.connect({ network: 'LocalNet' })

    const alice = await wg.createWalletIfNotExists({
        partyHint: `alice-${rnd}`,
        signingProvider: 'participant',
    })
    await wg.setPrimaryWallet(alice)
    await tap(dappPage, wg, '2000')

    await gotoDashboard(dappPage)

    // Verify the Wallets section is visible
    await expect(dappPage.getByText('Wallets')).toBeVisible({ timeout: 10000 })

    await dappPage.getByText('alice').first().click()

    // Verify we're on the wallet detail page
    await expect(dappPage.getByText('Back to Dashboard')).toBeVisible()
    await expect(
        dappPage.getByRole('heading', { name: 'Holdings' })
    ).toBeVisible()
    await expect(
        dappPage.getByRole('heading', { name: 'Transaction History' })
    ).toBeVisible()

    // Verify the AMT instrument is visible in holdings (the exact amount
    // merges with existing holdings, so don't check for a specific number)
    await expect(dappPage.getByText('AMT').first()).toBeVisible({
        timeout: 10000,
    })

    // Click "Back to Dashboard" to return
    await dappPage.getByText('Back to Dashboard').click()
    await expect(dappPage.getByText('Dashboard')).toBeVisible()
})
