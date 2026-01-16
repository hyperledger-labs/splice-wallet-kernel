// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, Locator, Page } from '@playwright/test'

export class WalletGateway {
    private readonly dappPage: Page
    private readonly connectButton: (dappPage: Page) => Locator
    private readonly openButton: (dappPage: Page) => Locator
    private _popup: Page | undefined

    constructor(args: {
        dappPage: Page
        connectButton: (dappPage: Page) => Locator
        openButton: (dappPage: Page) => Locator
    }) {
        this.dappPage = args.dappPage
        this.connectButton = args.connectButton
        this.openButton = args.openButton

        // Refresh the popup reference whenever a new popup appears.
        this.dappPage.on('popup', (p) => {
            this._popup = p
            p.on('close', () => {
                // Only unset when this is the last set popup.
                if (this._popup === p) this._popup = undefined
            })
        })
    }

    async connectToLocalNet(): Promise<void> {
        const connectButton = this.connectButton(this.dappPage)
        await expect(connectButton).toBeVisible()

        const discoverPopupPromise = this.dappPage.waitForEvent('popup')
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
    }

    async openPopup(): Promise<void> {
        const discoverPopupPromise = this.dappPage.waitForEvent('popup')
        const openButton = this.openButton(this.dappPage)
        await expect(openButton).toBeVisible()
        await openButton.click()
        await discoverPopupPromise
    }

    private get popup(): Page {
        if (!this._popup)
            throw new Error('popup closed: call openPopup() first')
        return this._popup
    }

    async setPrimaryWallet(partyId: string): Promise<void> {
        // Make sure we're on the right page.
        await this.popup.getByRole('button', { name: 'Toggle menu' }).click()
        await this.popup.getByRole('button', { name: 'Wallets' }).click()
        await expect(this.popup.getByText('Loading wallets…')).not.toBeVisible()

        // Check for existing user with that party hint.
        const wallet = this.popup
            .locator('.wallet-card')
            .filter({ hasText: partyId })
            .first()
        await wallet.getByRole('button', { name: 'Set Primary' }).click()
    }

    async createWalletIfNotExists(partyHint: string): Promise<string> {
        // Make sure we're on the right page.
        await this.popup.getByRole('button', { name: 'Toggle menu' }).click()
        await this.popup.getByRole('button', { name: 'Wallets' }).click()
        await expect(this.popup.getByText('Loading wallets…')).not.toBeVisible()

        // Check for existing user with that party hint.
        const pattern = new RegExp(`${partyHint}::[0-9a-f]+`)
        const wallets = this.popup.getByText(pattern)
        const walletsCount = await wallets.count()
        if (walletsCount > 0) {
            const partyId = (await wallets.first().innerText()).match(
                pattern
            )?.[0]
            if (partyId === undefined) {
                throw new Error(`did not find partyID for ${partyHint}`)
            }
            return partyId
        }

        // Create if necessary.
        await this.popup.getByRole('button', { name: 'Create New' }).click()
        await this.popup
            .getByRole('textbox', { name: 'Party ID hint:' })
            .fill(partyHint)
        await this.popup
            .getByLabel('Signing Provider:')
            .selectOption('participant')
        await this.popup.getByRole('button', { name: 'Create' }).click()
        await this.popup.getByRole('button', { name: 'Close' }).click()

        const partyId = (
            await this.popup.getByText(pattern).first().innerText()
        ).match(pattern)?.[0]
        if (partyId === undefined) {
            throw new Error(`did not find partyID for ${partyHint}`)
        }
        return partyId
    }

    async approveTransaction(): Promise<void> {
        await this.popup.getByRole('button', { name: 'Approve' }).click()
        await expect(
            this.popup.getByText('Transaction executed successfully')
        ).toBeVisible()
    }
}
