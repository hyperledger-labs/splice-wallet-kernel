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

    async connect(args: {
        network: 'LocalNet' | 'Local (OAuth IDP)'
        customURL?: string
    }): Promise<void> {
        const connectButton = this.connectButton(this.dappPage)
        await expect(connectButton).toBeVisible()

        const discoverPopupPromise = this.dappPage.waitForEvent('popup')
        await connectButton.click()
        const pickerPopup = await discoverPopupPromise

        await this.selectFromWalletPicker(pickerPopup, args.customURL)

        const popup = await this.waitForConnectFormPopup(pickerPopup)
        const selectNetwork = popup.locator('select#network')
        const networkOption = await selectNetwork
            .locator('option')
            .filter({ hasText: args.network })
            .first()
            .getAttribute('value')
        await selectNetwork.selectOption(networkOption)
        const confirmConnectButton = popup.getByRole('button', {
            name: 'Connect',
        })
        await confirmConnectButton.click()
        await expect(confirmConnectButton).not.toBeVisible()
    }

    async openPopup(): Promise<void> {
        const discoverPopupPromise = this.dappPage.waitForEvent('popup')
        const openButton = this.openButton(this.dappPage)
        await expect(openButton).toBeVisible()
        await openButton.click()
        await discoverPopupPromise
    }

    private async popup(): Promise<Page> {
        // NOTE(jaspervdj): Yes, having `(await this.popup())....` everywhere
        // is a bit ugly, but unfortunately the popup can be closed at any time
        // (in particular, a few seconds after approving a transaction), so
        // having popup async allows us to work around that (even if the popup
        // behaviour would change).

        for (let i = 0; i < 10 && !this._popup; i++) {
            await new Promise((resolve) => setTimeout(resolve, 1000))
        }
        if (!this._popup) {
            if (!this._popup) {
                throw new Error('popup closed: call openPopup() first')
            }
        }
        return this._popup
    }

    async setPrimaryWallet(partyId: string): Promise<void> {
        // Make sure we're on the right page.
        await (await this.popup())
            .getByRole('button', { name: 'Toggle menu' })
            .click()
        await (await this.popup())
            .getByRole('button', { name: 'Wallets' })
            .click()
        await expect(
            (await this.popup()).getByText('Loading wallets…')
        ).not.toBeVisible()

        // Check for existing user with that party hint.
        const wallet = (await this.popup())
            .locator('wg-wallet-card')
            .filter({ hasText: partyId })
            .first()
        await wallet.getByRole('button', { name: 'Set Primary' }).click()
    }

    async createWalletIfNotExists(args: {
        partyHint: string
        signingProvider: 'participant' | 'wallet-kernel'
        primary?: boolean
    }): Promise<string> {
        // Make sure we're on the right page.
        await (await this.popup())
            .getByRole('button', { name: 'Toggle menu' })
            .click()
        await (await this.popup())
            .getByRole('button', { name: 'Wallets' })
            .click()
        await expect(
            (await this.popup()).getByText('Loading wallets…')
        ).not.toBeVisible()

        // Check for existing wallet with that party hint.
        const pattern = new RegExp(`${args.partyHint}::[0-9a-f]+`)
        const wallets = (await this.popup()).locator(
            `wg-wallet-card[party-id*="${args.partyHint}"]`
        )
        const walletsCount = await wallets.count()
        if (walletsCount > 0) {
            const partyId = await wallets.first().getAttribute('party-id')
            if (partyId === null || !pattern.test(partyId)) {
                throw new Error(`did not find partyID for ${args.partyHint}`)
            }

            if (args.primary) {
                await wallets
                    .first()
                    .getByRole('button', { name: 'Set Primary' })
                    .click()
            }

            return partyId
        }

        // Create if necessary.
        await (await this.popup())
            .getByRole('button', { name: 'Create New' })
            .click()
        await (await this.popup())
            .getByRole('textbox', { name: 'Party ID hint:' })
            .fill(args.partyHint)
        await (await this.popup())
            .getByLabel('Signing Provider:')
            .selectOption(args.signingProvider)
        if (args.primary) {
            await (await this.popup())
                .getByRole('checkbox', { name: 'primary' })
                .check()
        }
        await (await this.popup())
            .getByRole('button', { name: 'Create' })
            .click()

        const newWallet = (await this.popup())
            .locator(`wg-wallet-card[party-id*="${args.partyHint}"]`)
            .first()
        await expect(newWallet).toBeVisible({ timeout: 15000 })

        await (await this.popup())
            .getByRole('button', { name: 'Close' })
            .click()
        const partyId = await newWallet.getAttribute('party-id')
        if (partyId === null || !pattern.test(partyId)) {
            throw new Error(`did not find partyID for ${args.partyHint}`)
        }
        return partyId
    }

    async approveTransaction(start: () => Promise<void>): Promise<{
        commandId: string
    }> {
        // NOTE(jaspervdj): I am passing in start (which is an async function
        // starting the transaction in the dApp, like clicking a button) as a
        // parameter here. The reason for that is that I was first doing some
        // setup work (like installing something to wait for a popup). This
        // turned out not to be necessary, but I think this API is more
        // forward-proof, since we may change how the popup behaves.
        await start()
        await expect(
            (await this.popup()).getByText(/Pending Transaction Request/)
        ).toBeVisible({ timeout: 15000 })
        const commandId = new URL((await this.popup()).url()).searchParams.get(
            'commandId'
        )
        if (!commandId) throw new Error('Approve popup has no commandId in URL')
        const popupPage = await this.popup()
        await popupPage.getByRole('button', { name: 'Approve' }).click()

        // Wait for the transaction to complete. The popup either auto-closes
        // or stays open with the Approve button hidden.
        // A "Target closed" error means the popup auto-closed successfully, so we treat it as a success.
        try {
            await Promise.race([
                popupPage.waitForEvent('close', { timeout: 30000 }),
                expect(
                    popupPage.getByRole('button', { name: 'Approve' })
                ).not.toBeVisible({ timeout: 30000 }),
            ])
        } catch (e: unknown) {
            // If the popup was already closed, that's a success signal
            const message = e instanceof Error ? e.message : String(e)
            if (
                !message.includes(
                    'Target page, context or browser has been closed'
                ) &&
                !message.includes('Target closed')
            ) {
                throw e
            }
        }
        return { commandId }
    }

    async reconnect(args: {
        network: 'LocalNet' | 'Local (OAuth IDP)'
        customURL?: string
    }): Promise<void> {
        const connectButton = this.connectButton(this.dappPage)
        await expect(connectButton).toBeVisible()

        const discoverPopupPromise = this.dappPage.waitForEvent('popup')
        await connectButton.click()
        const pickerPopup = await discoverPopupPromise

        await this.selectFromWalletPicker(pickerPopup, args.customURL)

        const popup = await this.waitForConnectFormPopup(pickerPopup)
        const selectNetwork = popup.locator('select#network')
        const networkOption = await selectNetwork
            .locator('option')
            .filter({ hasText: args.network })
            .first()
            .getAttribute('value')
        await selectNetwork.selectOption(networkOption)
        const confirmConnectButton = popup.getByRole('button', {
            name: 'Connect',
        })
        await confirmConnectButton.click()
        await expect(confirmConnectButton).not.toBeVisible()
    }

    private async selectFromWalletPicker(
        popup: Page,
        customURL?: string
    ): Promise<void> {
        if (customURL !== undefined) {
            const customUrlInput = popup.locator('.custom-url-input')
            await customUrlInput.waitFor({ state: 'visible', timeout: 3000 })
            await customUrlInput.fill(customURL)
            await popup.locator('.btn-add').click()
            return
        }

        const walletCard = popup.locator('.wallet-card').first()
        await walletCard.waitFor({ state: 'visible', timeout: 3000 })
        await walletCard.click()
    }

    private async waitForConnectFormPopup(initialPopup: Page): Promise<Page> {
        const hasConnectForm = async (page: Page): Promise<boolean> => {
            try {
                await page
                    .locator('select#network')
                    .first()
                    .waitFor({ state: 'visible', timeout: 300 })
                return true
            } catch {
                return false
            }
        }

        // Pre-fix behavior: picker page itself transitions to connect form.
        if (await hasConnectForm(initialPopup)) {
            return initialPopup
        }

        // New behavior: picker may close and the wallet connect form appears in
        // a fresh popup. Poll the tracked popup first to avoid races.
        for (let i = 0; i < 20; i++) {
            const popup = this._popup
            if (popup && !popup.isClosed() && (await hasConnectForm(popup))) {
                return popup
            }
            await new Promise((resolve) => setTimeout(resolve, 250))
        }

        const popup = await this.dappPage.waitForEvent('popup', {
            timeout: 5000,
        })
        await popup.locator('select#network').waitFor({ state: 'visible' })
        return popup
    }

    async logoutFromPopup(): Promise<void> {
        const popup = await this.popup()
        await popup.getByRole('button', { name: 'Toggle menu' }).click()
        await popup.locator('button').filter({ hasText: 'Logout' }).click()
        await popup.waitForEvent('close', { timeout: 5000 })
        this._popup = undefined
    }

    async closePopup(): Promise<void> {
        const popup = await this.popup()
        await popup.close()
        this._popup = undefined
    }

    async isPopupOpen(): Promise<boolean> {
        try {
            const popup = await this.popup()
            return popup && !popup.isClosed()
        } catch {
            return false
        }
    }

    async waitForPopupClosed(): Promise<void> {
        if (this._popup) {
            await this._popup.waitForEvent('close', { timeout: 5000 })
            this._popup = undefined
        }
    }

    async waitForPopupUrl(expectedUrl: string | RegExp): Promise<void> {
        const popup = await this.popup()

        return popup.waitForURL(expectedUrl, { timeout: 5000 })
    }
}
