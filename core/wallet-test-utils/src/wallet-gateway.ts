// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, Locator, Page } from '@playwright/test'

// manage a playwright popup via title
export class PopupMgr {
    private _reference: Page | undefined

    constructor(
        private readonly parent: Page,
        private readonly url_matcher: RegExp,
        // function that triggers the popup to open
        private readonly trigger: () => Promise<void>
    ) {
        this.parent.on('popup', async (p) => {
            try {
                await p.waitForURL(url_matcher, { timeout: 5000 })
                this._reference = p
            } catch {
                return
            }
        })
    }

    // If the popup is already open within Playwright's browser context, find it
    existing(): Page | undefined {
        if (this._reference && !this._reference.isClosed()) {
            return this._reference
        }

        const context = this.parent.context()
        const pages = context.pages()

        return pages.find((p) => {
            try {
                return p.url().match(this.url_matcher)
            } catch {
                return false
            }
        })
    }

    isOpen(): boolean {
        const existing = this.existing()
        if (!existing) {
            return false
        } else {
            return !existing.isClosed()
        }
    }

    async open(): Promise<Page> {
        const potential = this.existing()

        if (potential && !potential.isClosed()) {
            this._reference = potential
            return potential
        }

        const [popup] = await Promise.all([
            this.parent.waitForEvent('popup'),
            this.trigger(),
        ])

        await popup.waitForURL(this.url_matcher, { timeout: 5000 })
        this._reference = popup

        return popup
    }

    async close(): Promise<void> {
        const potential = this.existing()
        if (potential) {
            potential.close()
            this._reference = undefined
        }
    }

    async waitForURL(url: RegExp) {
        const popup = await this.open()
        await popup.waitForURL(url)
    }
}

export class WalletGateway {
    private readonly dappPage: Page
    private readonly connectButton: (dappPage: Page) => Locator
    private readonly openButton: (dappPage: Page) => Locator
    private _discovery: PopupMgr
    public popup: PopupMgr

    constructor(args: {
        dappPage: Page
        connectButton: (dappPage: Page) => Locator
        openButton: (dappPage: Page) => Locator
    }) {
        this.dappPage = args.dappPage
        this.connectButton = args.connectButton
        this.openButton = args.openButton

        this._discovery = new PopupMgr(this.dappPage, /blob/, async () => {
            const connectButton = this.connectButton(this.dappPage)
            await expect(connectButton).toBeVisible()

            await connectButton.click()
        })

        this.popup = new PopupMgr(this.dappPage, /localhost:3030/, async () => {
            const openButton = this.openButton(this.dappPage)
            await expect(openButton).toBeVisible()
            await openButton.click()
        })
    }

    async connect(args: {
        network: 'LocalNet' | 'Local (OAuth IDP)'
        customURL?: string
    }): Promise<void> {
        const discoverer = await this._discovery.open()

        await this.selectFromWalletPicker(discoverer, args.customURL)

        const selectNetwork = discoverer.locator('select#network')
        const networkOption = await selectNetwork
            .locator('option')
            .filter({ hasText: args.network })
            .first()
            .getAttribute('value')
        await selectNetwork.selectOption(networkOption)
        const confirmConnectButton = discoverer.getByRole('button', {
            name: 'Connect',
        })

        await Promise.all([
            this.popup.waitForURL(/wallets/),
            confirmConnectButton.click(),
        ])
    }

    async setPrimaryWallet(partyId: string): Promise<void> {
        // Make sure we're on the right page.
        const popup = await this.popup.open()
        await popup.getByRole('button', { name: 'Toggle menu' }).click()
        await popup.getByRole('button', { name: 'Wallets' }).click()
        await expect(popup.getByText('Loading wallets…')).not.toBeVisible()

        // Check for existing user with that party hint.
        const wallet = popup
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
        const popup = await this.popup.open()

        await popup.getByRole('button', { name: 'Toggle menu' }).click()
        await popup.getByRole('button', { name: 'Wallets' }).click()
        await expect(popup.getByText('Loading wallets…')).not.toBeVisible()

        // Check for existing wallet with that party hint.
        const pattern = new RegExp(`${args.partyHint}::[0-9a-f]+`)
        const wallets = popup.locator(
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
        await popup.getByRole('button', { name: 'Create New' }).click()
        await popup
            .getByRole('textbox', { name: 'Party ID hint:' })
            .fill(args.partyHint)
        await popup
            .getByLabel('Signing Provider:')
            .selectOption(args.signingProvider)
        if (args.primary) {
            await popup.getByRole('checkbox', { name: 'primary' }).check()
        }
        await popup.getByRole('button', { name: 'Create' }).click()
        await expect(
            popup.getByRole('button', { name: 'Create' })
        ).toBeEnabled()
        await popup.getByRole('button', { name: 'Close' }).click()

        const newWallet = popup
            .locator(`wg-wallet-card[party-id*="${args.partyHint}"]`)
            .first()
        await expect(newWallet).toBeVisible()
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

        const popup = await this.popup.open()
        await expect(
            popup.getByText(/Pending Transaction Request/)
        ).toBeVisible({ timeout: 15000 })
        const commandId = new URL(popup.url()).searchParams.get('commandId')
        if (!commandId) throw new Error('Approve popup has no commandId in URL')

        const popupPage = await this.popup.open()
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

    async logoutFromPopup(): Promise<void> {
        const popup = await this.popup.open()
        await popup.getByRole('button', { name: 'Toggle menu' }).click()
        await popup.locator('button').filter({ hasText: 'Logout' }).click()
        await popup.waitForEvent('close', { timeout: 5000 })
    }
}
