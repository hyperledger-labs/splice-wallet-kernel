// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { test, expect } from '@playwright/test'
import { createWalletGateway, setupRegistry, tap, gotoDashboard } from './utils'

test('registry management', async ({ page: dappPage }) => {
    await setupRegistry(dappPage)

    // Verify we're on settings page and registry was added
    await expect(dappPage.getByText('Registries')).toBeVisible()
    await expect(dappPage.getByRole('cell', { name: /^DSO::/ })).toBeVisible()
    await expect(
        dappPage.getByRole('cell', {
            name: 'http://scan.localhost:4000',
        })
    ).toBeVisible()

    // Verify the delete button is present for the registry
    await expect(
        dappPage.locator('button', {
            has: dappPage.locator('[data-testid="DeleteIcon"]'),
        })
    ).toBeVisible()
})

test('tap via settings page', async ({ page: dappPage }) => {
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

    await tap(dappPage, wg, '5000')

    // Verify holdings appear on dashboard
    const aliceWallet = dappPage.getByTestId(`wallet-preview-${alice}`)
    const amtRow = aliceWallet.getByTestId('instrument-row-AMT')
    await expect(amtRow).toBeVisible({ timeout: 15000 })
    await expect(amtRow.getByTestId('instrument-total-amount')).toContainText(
        '5000'
    )
})
