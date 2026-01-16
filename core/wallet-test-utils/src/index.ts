// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, Page } from '@playwright/test'

export const connectToLocalNet = async (dappPage: Page): Promise<Page> => {
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

export const setPrimaryWallet = async (
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

export const createWalletIfNotExists = async (
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
