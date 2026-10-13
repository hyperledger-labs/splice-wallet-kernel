// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, type Locator, type Page, test } from '@playwright/test'
import { openWalletPicker } from './wallet-picker.js'

export interface NetworkFormInput {
    id: string
    name: string
    description: string
    identityProviderId: string
    ledgerApi: string
    synchronizerId: string
    auth: {
        clientId: string
        audience: string
        scope: string
    }
}

export type IdpFormInput =
    | {
          id: string
          type: 'oauth'
          issuer: string
          configUrl: string
      }
    | {
          id: string
          type: 'self_signed'
          issuer: string
          configUrl: string
      }
    | {
          id: string
          type: 'self_issued'
          configUrl: string
      }

export type ActivityStatus =
    | 'pending'
    | 'signed'
    | 'executed'
    | 'failed'
    | 'rejected'
    | 'awaiting-signature'

// Limit on how many pages to go through when looking for a tx / network / idp.
// Way smaller number would be needed for CI, as db is reset after each full run,
// but on local it accumulates quickly.
const MAX_PAGES_TO_SEARCH = 50

export type SigningProviderName =
    | 'participant'
    | 'wallet-kernel'
    | 'blockdaemon'
    | 'dfns'
    | 'fireblocks'
    | 'securosys'
    | 'bitgo'

export type ExternalSigningProvider = Exclude<
    SigningProviderName,
    'participant' | 'wallet-kernel'
>

// isPopup: true - WG opened in popup by dApp
// isPopup: false - WG opened in separate tab
export type WalletGatewayArgs =
    | {
          isPopup?: true
          dappPage: Page
          connectButton: (dappPage: Page) => Locator
          openButton: (dappPage: Page) => Locator
      }
    | {
          isPopup: false
          page: Page
      }

export type LoginCredentials = {
    clientId?: string
    clientSecret?: string
}

export class WalletGateway {
    private readonly isPopup: boolean
    private readonly dappPage: Page | undefined
    private readonly connectButton: ((dappPage: Page) => Locator) | undefined
    private readonly openButton: ((dappPage: Page) => Locator) | undefined
    private readonly directPage: Page | undefined
    private _popup: Page | undefined

    constructor(args: WalletGatewayArgs) {
        this.isPopup = args.isPopup !== false

        if (args.isPopup === false) {
            this.directPage = args.page
            return
        }

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

    // Only for WG in popup, not for a WG as separate page outside of dapp.
    private requireDapp(): {
        dappPage: Page
        connectButton: (dappPage: Page) => Locator
        openButton: (dappPage: Page) => Locator
    } {
        if (!this.dappPage || !this.connectButton || !this.openButton) {
            throw new Error(
                'this WalletGateway was opened directly in a tab, so it has no dApp to drive'
            )
        }
        return {
            dappPage: this.dappPage,
            connectButton: this.connectButton,
            openButton: this.openButton,
        }
    }

    async connect(args: {
        network: string
        customURL?: string
        credentials?: LoginCredentials
    }): Promise<void> {
        await test.step(`wallet gateway: connect to ${args.network}`, async () => {
            const dapp = this.requireDapp()
            const connectButton = dapp.connectButton(dapp.dappPage)
            await expect(
                connectButton,
                'the dApp should offer a way to connect a wallet'
            ).toBeVisible()

            const pickerPopup = await openWalletPicker(
                dapp.dappPage,
                connectButton
            )

            await this.selectFromWalletPicker(pickerPopup, args.customURL)

            const popup = await this.waitForConnectFormPopup(pickerPopup)
            const selectNetwork = popup.getByLabel('Select a network')
            await expect(
                selectNetwork,
                'the wallet gateway has a network select'
            ).toBeVisible()
            await selectNetwork.selectOption({ label: args.network })
            await this.fillLoginCredentials(popup, args.credentials)
            const confirmConnectButton = popup.getByRole('button', {
                name: 'Connect',
            })
            await confirmConnectButton.click()
            await expect(
                confirmConnectButton,
                'the login form should be gone once the gateway accepts the connection'
            ).not.toBeVisible()
            await expect(
                popup.getByTestId('network-status-connected'),
                `the wallet gateway should report itself connected to ${args.network}`
            ).toBeVisible()
        })
    }

    async connectToSelfIssuedNetwork(args: {
        network: string
        username: string
        customURL?: string
    }): Promise<void> {
        await test.step(`wallet gateway: connect to ${args.network}`, async () => {
            const dapp = this.requireDapp()
            const connectButton = dapp.connectButton(dapp.dappPage)
            await expect(
                connectButton,
                'the dApp should offer a way to connect a wallet'
            ).toBeVisible()

            const pickerPopup = await openWalletPicker(
                dapp.dappPage,
                connectButton
            )

            await this.selectFromWalletPicker(pickerPopup, args.customURL)

            const popup = await this.waitForConnectFormPopup(pickerPopup)
            const selectNetwork = popup.getByLabel('Select a network')
            await expect(
                selectNetwork,
                'the wallet gateway has a network select'
            ).toBeVisible()
            await selectNetwork.selectOption({ label: args.network })
            const usernameInput = popup.getByLabel('Username')
            await expect(
                usernameInput,
                'self-issued login should ask for a username'
            ).toBeVisible()
            await usernameInput.fill(args.username)
            const confirmConnectButton = popup.getByRole('button', {
                name: 'Connect',
            })
            await confirmConnectButton.click()

            await expect(
                popup,
                'self-issued login should open authentication-party onboarding'
            ).toHaveURL(/\/onboarding\/?/)
            await expect(
                popup.getByText('No onboarding session found'),
                'onboarding should have a session from the login step'
            ).toHaveCount(0)
        })
    }

    async submitSelfIssuedOnboarding(args: {
        expectedNetwork: string
        partyHint: string
        signingProvider: SigningProviderName
    }): Promise<string> {
        return test.step(`wallet gateway: submit self-issued onboarding for ${args.partyHint}`, async () => {
            const popup = await this.page()
            await expect(
                popup.getByRole('heading', {
                    name: 'Create authentication party',
                }),
                'a new self-issued user should be asked to create an authentication party'
            ).toBeVisible()
            const form = popup.locator('wg-wallet-create-form')
            await expect(form.getByLabel('Party ID Hint')).toBeVisible()
            await expect(form.getByLabel('Signing Provider')).toBeVisible()
            await form.getByLabel('Party ID Hint').fill(args.partyHint)
            await form
                .getByLabel('Signing Provider')
                .selectOption(args.signingProvider)
            await form.locator('button[type="submit"]').click()

            await expect(
                popup.getByTestId('network-status-connected'),
                `the wallet gateway should report itself connected to ${args.expectedNetwork}`
            ).toBeVisible()

            const wallet = popup
                .locator(`wg-wallet-card[party-id*="${args.partyHint}"]`)
                .first()
            await expect(
                wallet,
                `the parties page should list ${args.partyHint}`
            ).toBeVisible()
            const partyId = await wallet.getAttribute('party-id')
            if (!partyId) {
                // Assures typescript it's a string
                throw new Error(`did not find partyID for ${args.partyHint}`)
            }
            return partyId
        })
    }

    async selectSelfIssuedAuthenticationParty(args: {
        expectedNetwork: string
        partyId: string
    }): Promise<void> {
        await test.step(`wallet gateway: select authentication party ${args.partyId}`, async () => {
            const popup = await this.page()
            await expect(
                popup.getByRole('heading', {
                    name: 'Connect authentication party',
                }),
                'an existing self-issued user should choose a stored authentication party'
            ).toBeVisible()
            await expect(
                popup.getByText(
                    'Choose the party that authenticates this account.'
                )
            ).toBeVisible()

            const wallet = popup.locator(
                `wg-wallet-card[party-id="${args.partyId}"]`
            )
            await expect(
                wallet,
                `onboarding should list the stored party ${args.partyId}`
            ).toBeVisible()
            await wallet.getByRole('button', { name: 'Select' }).click()

            await expect(
                popup.getByTestId('network-status-connected'),
                `the wallet gateway should report itself connected to ${args.expectedNetwork}`
            ).toBeVisible()
        })
    }

    async openPopup(): Promise<void> {
        await test.step('wallet gateway: open the popup', async () => {
            const dapp = this.requireDapp()
            const discoverPopupPromise = dapp.dappPage.waitForEvent('popup')
            const openButton = dapp.openButton(dapp.dappPage)
            await expect(
                openButton,
                'the dApp should have a button to open the wallet'
            ).toBeVisible()
            await openButton.click()
            await discoverPopupPromise
        })
    }

    private async page(): Promise<Page> {
        // NOTE(jaspervdj): Yes, having `(await this.page())....` everywhere
        // is a bit ugly, but unfortunately the popup can be closed at any time
        // (in particular, a few seconds after approving a transaction), so
        // having it async allows us to work around that (even if the popup
        // behaviour would change). A directly opened tab is simply always
        // there.

        if (this.directPage) return this.directPage

        for (let i = 0; i < 10 && !this._popup; i++) {
            await new Promise((resolve) => setTimeout(resolve, 1000))
        }
        if (!this._popup) {
            throw new Error('popup closed: call openPopup() first')
        }
        return this._popup
    }

    async setPrimaryWallet(partyId: string): Promise<void> {
        await test.step(`wallet gateway: make ${partyId} the primary party`, async () => {
            await this.gotoPartiesPage()

            const wallet = (await this.page())
                .locator(`wg-wallet-card[party-id="${partyId}"]`)
                .first()
            await expect(
                wallet,
                `the parties page should list ${partyId}`
            ).toBeVisible()

            const setPrimaryButton = wallet.getByRole('button', {
                name: 'Set as primary',
            })

            if (await setPrimaryButton.isVisible().catch(() => false)) {
                await setPrimaryButton.click()
            }

            // now, wait until the party shows up as PRIMARY
            await expect(
                wallet.getByText('PRIMARY', { exact: true }),
                `${partyId} should be badged as the primary party`
            ).toBeVisible()
        })
    }

    async createWalletIfNotExists(args: {
        partyHint: string
        signingProvider: SigningProviderName
        vaultName?: string
        primary?: boolean
    }): Promise<string> {
        return test.step(`wallet gateway: create ${args.signingProvider} party ${args.partyHint} if it does not exist`, async () => {
            await this.gotoPartiesPage()

            const pattern = new RegExp(`${args.partyHint}::[0-9a-f]+`)
            const wallets = (await this.page()).locator(
                `wg-wallet-card[party-id*="${args.partyHint}"]`
            )
            const walletsCount = await wallets.count()

            // Exists path
            if (walletsCount > 0) {
                const partyId = await wallets.first().getAttribute('party-id')
                if (partyId === null || !pattern.test(partyId)) {
                    throw new Error(
                        `did not find partyID for ${args.partyHint}, got ${partyId}`
                    )
                }

                if (args.primary) {
                    await this.setPrimaryWallet(partyId)
                }

                return partyId
            }

            // Not exists path
            await (
                await this.page()
            )
                .getByRole('button', { name: 'New' })
                .click()
            await expect(
                (await this.page()).getByRole('heading', {
                    name: 'Create a new party',
                }),
                'clicking New should open the party creation form'
            ).toBeVisible()
            await (
                await this.page()
            )
                .getByLabel('Party ID Hint')
                .fill(args.partyHint)
            await (
                await this.page()
            )
                .getByLabel('Signing Provider')
                .selectOption(args.signingProvider)
            if (args.signingProvider === 'fireblocks') {
                if (!args.vaultName) {
                    throw new Error(
                        'vaultName is required when signingProvider is fireblocks'
                    )
                }
                const vaultSelect = (await this.page()).getByLabel('Vault name')
                await expect(
                    vaultSelect.getByRole('option', { name: args.vaultName }),
                    `the form should offer the Fireblocks vault ${args.vaultName}`
                ).toBeAttached()
                await vaultSelect.selectOption({ label: args.vaultName })
            }
            if (args.primary) {
                await (
                    await this.page()
                )
                    .getByRole('checkbox', { name: 'Set as primary wallet' })
                    .check()
            }
            await (
                await this.page()
            )
                .getByRole('button', { name: 'Create' })
                .click()

            await this.waitForPartiesPageReady()

            const newWallet = (await this.page())
                .locator(`wg-wallet-card[party-id*="${args.partyHint}"]`)
                .first()
            await expect(
                newWallet,
                `the parties page should list the newly created ${args.partyHint}`
            ).toBeVisible()

            const partyId = await newWallet.getAttribute('party-id')
            if (partyId === null || !pattern.test(partyId)) {
                throw new Error(`did not find partyID for ${args.partyHint}`)
            }

            if (args.primary) {
                await this.setPrimaryWallet(partyId)
            }

            return partyId
        })
    }

    async allocateWalletParty(partyId: string): Promise<void> {
        await test.step(`wallet gateway: allocate ${partyId}`, async () => {
            await this.gotoPartiesPage()
            const walletCard = (await this.page())
                .locator(`wg-wallet-card[party-id="${partyId}"]`)
                .first()
            await expect(
                walletCard,
                `the parties page should list ${partyId}`
            ).toBeVisible()

            const allocateButton = walletCard.getByRole('button', {
                name: 'Allocate party',
                exact: true,
            })
            await expect(
                allocateButton,
                `${partyId} should still be unallocated`
            ).toBeVisible()
            await allocateButton.click()
            await expect(
                allocateButton,
                `${partyId} should no longer have allocate button once allocated`
            ).not.toBeVisible()
        })
    }

    async getWalletExternalTxId(partyId: string): Promise<string> {
        return test.step(`wallet gateway: read the external tx id of ${partyId}`, async () => {
            await this.gotoPartiesPage()
            const walletCard = (await this.page())
                .locator(`wg-wallet-card[party-id="${partyId}"]`)
                .first()
            await expect(
                walletCard,
                `the parties page should list ${partyId}`
            ).toBeVisible()

            const txId = await walletCard
                .locator('.meta')
                .getAttribute('data-test-external-tx-id')

            if (!txId) {
                throw new Error(
                    `did not find external tx id for party ${partyId}`
                )
            }

            return txId
        })
    }

    async approveTransaction(
        start: () => Promise<void>,
        opts?: {
            waitForClose?: boolean
            isExternalSigning?: boolean
            review?: (approvalPage: Page) => Promise<void>
        }
    ): Promise<{
        commandId: string
    }> {
        // NOTE(jaspervdj): I am passing in start (which is an async function
        // starting the transaction in the dApp, like clicking a button) as a
        // parameter here. The reason for that is that I was first doing some
        // setup work (like installing something to wait for a popup). This
        // turned out not to be necessary, but I think this API is more
        // forward-proof, since we may change how the popup behaves.
        return test.step('wallet gateway: approve the pending transaction', async () => {
            await start()

            const popupPage = await this.page()
            const approveButton = popupPage.getByRole('button', {
                name: 'Approve',
            })
            await expect(
                approveButton,
                'the wallet should show approval button for the submitted transaction'
            ).toBeVisible()

            const commandId = new URL(popupPage.url()).searchParams.get(
                'commandId'
            )
            if (!commandId)
                throw new Error('Approve popup has no commandId in URL')

            await opts?.review?.(popupPage)
            await approveButton.click()

            if (opts?.isExternalSigning) {
                //TODO: race condition where the poll already updated to signed. figure out a better assertion
                // await this.expectActivityWithStatus(
                //     commandId,
                //     'awaiting-signature'
                // )

                await expect(
                    popupPage.getByRole('button', { name: 'Approve' }),
                    'the popup should stay open while the provider signs'
                ).toBeVisible()
                return { commandId }
            }

            if (opts?.waitForClose !== false) {
                await this.waitForPopupToCloseAfterAction(popupPage)
            }
            return { commandId }
        })
    }

    async rejectTransaction(
        start: () => Promise<void>,
        opts?: { waitForClose?: boolean }
    ): Promise<{
        commandId: string
    }> {
        return test.step('wallet gateway: reject the pending transaction', async () => {
            await start()

            const popupPage = await this.page()
            const rejectButton = popupPage.getByRole('button', {
                name: 'Reject',
            })
            await expect(
                rejectButton,
                'the wallet should show reject button for the submitted transaction'
            ).toBeVisible()

            const commandId = new URL(popupPage.url()).searchParams.get(
                'commandId'
            )
            if (!commandId)
                throw new Error('Approve popup has no commandId in URL')

            let dialogType: string | undefined
            popupPage.once('dialog', async (dialog) => {
                dialogType = dialog.type()
                await dialog.accept()
            })

            await rejectButton.click()

            await expect
                .poll(() => dialogType, {
                    message:
                        'rejecting a transaction should ask the user to confirm',
                    timeout: 5000,
                })
                .toBe('confirm')

            if (opts?.waitForClose !== false) {
                await this.waitForPopupToCloseAfterAction(popupPage)
            }
            return { commandId }
        })
    }

    async executeSignedTransaction(opts?: {
        waitForClose?: boolean
    }): Promise<void> {
        await test.step('wallet gateway: submit the externally signed transaction', async () => {
            const popupPage = await this.page()
            const approveButton = popupPage.getByRole('button', {
                name: 'Approve',
            })
            await expect(
                approveButton,
                'the wallet should show approve button for the submitted transaction'
            ).toBeVisible()
            await approveButton.click()

            if (opts?.waitForClose !== false) {
                await this.waitForPopupToCloseAfterAction(popupPage)
            }
        })
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
                    .getByLabel('Select a network')
                    .waitFor({ state: 'visible', timeout: 300 })
                return true
            } catch {
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

        const popup = await this.requireDapp().dappPage.waitForEvent('popup', {
            timeout: 5000,
        })
        if (await hasConnectForm(popup)) {
            return popup
        }
        throw new Error('wallet connect form popup did not appear')
    }

    private async fillLoginCredentials(
        page: Page,
        credentials?: LoginCredentials
    ): Promise<void> {
        const clientId = credentials?.clientId
        if (clientId !== undefined) {
            const clientIdInput = page.getByLabel('Client ID')
            await expect(
                clientIdInput,
                'Client ID was provided but the login form has no Client ID input'
            ).toBeVisible()
            await clientIdInput.fill(clientId)
        }

        const clientSecret = credentials?.clientSecret
        if (clientSecret !== undefined) {
            const clientSecretInput = page.getByLabel('Client Secret')
            await expect(
                clientSecretInput,
                'Client Secret was provided but the login form has no Client Secret input'
            ).toBeVisible()
            await clientSecretInput.fill(clientSecret)
        }
    }

    // Logs in to a gateway that was opened directly, without a dApp.
    async login(
        network: string,
        credentials?: LoginCredentials
    ): Promise<void> {
        await test.step(`wallet gateway: log in to ${network}`, async () => {
            const page = await this.page()
            const selectNetwork = page.getByLabel('Select a network')
            await expect(
                selectNetwork,
                'the wallet gateway has a network select'
            ).toBeVisible()
            await selectNetwork.selectOption({ label: network })
            await this.fillLoginCredentials(page, credentials)
            await page.getByRole('button', { name: 'Connect' }).click()
            // Wait for the OAuth redirect chain to complete and land on the parties page.
            await page.waitForURL(/\/parties/, { timeout: 30000 })
        })
    }

    async logout(): Promise<void> {
        await test.step('wallet gateway: log out', async () => {
            const page = await this.page()
            await page.locator('button[aria-haspopup="menu"]').click()
            await page.getByRole('button', { name: 'Logout' }).click()
            // Popup windows close on logout; directly opened tabs redirect to
            // /login. Promise.any so that whichever does not apply timing out is
            // not itself a failure, and neither is left as an unhandled rejection.
            try {
                await Promise.any([
                    page.waitForEvent('close', { timeout: 5000 }),
                    page.waitForURL(/\/login/, { timeout: 5000 }),
                ])
            } catch (e: unknown) {
                throw new Error(
                    'logout did not take effect - the gateway neither closed nor returned to /login',
                    { cause: e }
                )
            }
        })
    }

    async logoutFromPopup(): Promise<void> {
        await this.logout()
        this._popup = undefined
    }

    async closePopup(): Promise<void> {
        const popup = await this.page()
        await popup.close()
        this._popup = undefined
    }

    async isPopupOpen(): Promise<boolean> {
        const popup = this.directPage ?? this._popup
        return popup !== undefined && !popup.isClosed()
    }

    async waitForPopupUrl(expectedUrl: string | RegExp): Promise<void> {
        const popup = await this.page()

        return popup.waitForURL(expectedUrl, { timeout: 5000 })
    }

    private async waitForPopupToCloseAfterAction(
        popupPage: Page
    ): Promise<void> {
        // For dApp-triggered approvals the popup is opened with
        // `closeafteraction`, so success is signalled by the popup closing.
        try {
            await popupPage.waitForEvent('close', { timeout: 30000 })
        } catch (e: unknown) {
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
    }

    private async gotoPartiesPage(): Promise<void> {
        const popup = await this.page()
        await popup.locator('button[aria-haspopup="menu"]').click()
        await popup
            .getByRole('button', { name: 'Parties', exact: true })
            .click()
        await this.waitForPartiesPageReady()
    }

    private async waitForPartiesPageReady(): Promise<void> {
        const popup = await this.page()
        await expect(
            popup.getByRole('button', { name: 'New' }),
            'the parties page should have rendered'
        ).toBeVisible()
        await expect(
            popup.getByText('Loading parties...'),
            'the parties page should have finished loading'
        ).not.toBeVisible()
    }

    async gotoNetworksPage(): Promise<void> {
        const popup = await this.page()
        await popup.locator('button[aria-haspopup="menu"]').click()
        await popup
            .getByRole('button', { name: 'Networks', exact: true })
            .click()
        await this.waitForNetworksPageReady()
    }

    async hasNewNetworkButton(): Promise<boolean> {
        const popup = await this.page()
        return (
            (await popup
                .getByRole('button', { name: 'New', exact: true })
                .count()) > 0
        )
    }

    async addNetwork(network: NetworkFormInput): Promise<void> {
        await test.step(`wallet gateway: add network ${network.id}`, async () => {
            await this.gotoNetworksPage()
            const popup = await this.page()

            const newButton = popup.getByRole('button', {
                name: 'New',
                exact: true,
            })
            await expect(
                newButton,
                'an admin should be offered a way to add a network'
            ).toBeVisible()
            await newButton.click()

            await expect(
                popup.getByRole('heading', { name: 'Add a new network' }),
                'clicking New should open the network form'
            ).toBeVisible()

            await this.fillNetworkForm(network)

            await popup.locator('[data-test-id="add-network-button"]').click()
            await this.waitForNetworksPageReady()
        })
    }

    async updateNetworkName(networkId: string, newName: string): Promise<void> {
        await test.step(`wallet gateway: rename network ${networkId} to ${newName}`, async () => {
            await this.openNetworkReview(networkId)
            const popup = await this.page()

            await this.fillNetworkFormField('Name', newName)
            await popup
                .locator('[data-test-id="update-network-button"]')
                .click()
            await this.waitForNetworksPageReady()
        })
    }

    async findNetworkCard(networkId: string): Promise<Locator> {
        await this.waitForNetworksPageReady()
        return this.findInPaginatedList(
            `Network card for "${networkId}"`,
            (popup) =>
                popup.locator('network-card').filter({ hasText: networkId })
        )
    }

    async expectFirstNetworkNotEditable(): Promise<void> {
        await test.step('wallet gateway: the listed networks cannot be edited', () =>
            this.assertFirstNetworkNotEditable())
    }

    private async assertFirstNetworkNotEditable(): Promise<void> {
        const popup = await this.page()
        await this.waitForNetworksPageReady()

        const firstCard = popup.locator('network-card').first()
        await expect(
            firstCard,
            'the networks page should list at least one network'
        ).toBeVisible()

        await expect(
            firstCard.locator('.net-card.readonly'),
            'a non-admin should see the network card rendered read-only'
        ).toBeVisible()

        await firstCard.click()

        await expect(
            popup.getByRole('heading', { name: 'Review network' }),
            'clicking a read-only network card should not open the review form'
        ).toHaveCount(0)
        await expect(
            popup.getByRole('heading', { name: 'Networks' }),
            'the networks list should still be shown after clicking a read-only card'
        ).toBeVisible()
    }

    private async openNetworkReview(networkId: string): Promise<void> {
        const card = await this.findNetworkCard(networkId)
        await card.click()

        const popup = await this.page()
        await expect(
            popup.getByRole('heading', { name: 'Review network' }),
            `clicking the card for ${networkId} should open its review form`
        ).toBeVisible()
    }

    private async fillNetworkForm(network: NetworkFormInput): Promise<void> {
        const popup = await this.page()

        await this.fillNetworkFormField('Network Id', network.id)
        await this.fillNetworkFormField('Name', network.name)
        await this.fillNetworkFormField('Description', network.description)
        await this.fillNetworkFormField(
            'Synchronizer Id',
            network.synchronizerId
        )
        await this.fillNetworkFormField(
            'Identity Provider Id',
            network.identityProviderId
        )
        await this.fillNetworkFormField(
            'Ledger API Base Url',
            network.ledgerApi
        )

        await popup
            .locator('[data-test-id="auth-editor-client-id-input"]')
            .first()
            .fill(network.auth.clientId)
        await popup
            .locator('[data-test-id="auth-editor-audience-input"]')
            .first()
            .fill(network.auth.audience)
        await popup
            .locator('[data-test-id="auth-editor-scope-input"]')
            .first()
            .fill(network.auth.scope)
    }

    private async fillNetworkFormField(
        label: string,
        value: string
    ): Promise<void> {
        const popup = await this.page()
        // The form labels aren't associated with their inputs via `for`, so
        // locate the input via the field group that contains the label text.
        const input = popup
            .locator(
                `network-form .field-group:has(> label:has-text("${label}")) input`
            )
            .first()
        await expect(
            input,
            `the network form should have a "${label}" field`
        ).toBeVisible()
        await input.fill(value)
    }

    // Traverse pagination looking for a specific card defined by buildItemLocator
    // Wait for page to be ready (with first page loaded) before calling it
    private async findInPaginatedList(
        itemDescription: string,
        buildItemLocator: (popup: Page) => Locator,
        options?: { afterPageChange?: () => Promise<void> }
    ): Promise<Locator> {
        const popup = await this.page()
        const pagination = popup.locator('wg-pagination').first()
        const rangeLabel = pagination.locator('.pagination span')
        const nextButton = pagination.getByRole('button', {
            name: 'Next page',
        })

        let pagesSearched = 0
        while (pagesSearched < MAX_PAGES_TO_SEARCH) {
            pagesSearched++

            const item = buildItemLocator(popup).first()
            if ((await item.count()) > 0) {
                await expect(
                    item,
                    `${itemDescription} should be shown`
                ).toBeVisible({ timeout: 5000 })
                return item
            }

            if ((await pagination.count()) === 0) {
                break
            }
            if (!(await nextButton.isEnabled())) {
                break
            }

            const before = (await rangeLabel.textContent()) ?? ''
            await nextButton.click()
            await expect(
                rangeLabel,
                'paging forward should show a different range of items'
            ).not.toHaveText(before, {
                timeout: 10000,
            })
            if (options?.afterPageChange) {
                await options.afterPageChange()
            }
        }

        const shown = (await rangeLabel.textContent().catch(() => null)) ?? ''
        throw new Error(
            pagesSearched < MAX_PAGES_TO_SEARCH
                ? `${itemDescription} not found in any of the ${pagesSearched} page(s) of the list (last page showed "${shown}")`
                : `${itemDescription} not found in the first ${pagesSearched} pages of the list (last page showed "${shown}"). Increase MAX_PAGES_TO_SEARCH if you need to traverse more pages.`
        )
    }

    private async waitForNetworksPageReady(): Promise<void> {
        const popup = await this.page()
        await expect(
            popup.getByRole('heading', { name: 'Networks' }),
            'the networks page should have rendered'
        ).toBeVisible()

        await expect(
            popup.locator('network-card').first(),
            'the networks page should have finished loading its first network'
        ).toBeVisible()
    }

    async gotoIdentityProvidersPage(): Promise<void> {
        const popup = await this.page()
        await popup.locator('button[aria-haspopup="menu"]').click()
        await popup
            .getByRole('button', { name: 'Identity Providers', exact: true })
            .click()
        await this.waitForIdentityProvidersPageReady()
    }

    async hasNewIdpButton(): Promise<boolean> {
        const popup = await this.page()
        return (
            (await popup
                .getByRole('button', { name: 'New', exact: true })
                .count()) > 0
        )
    }

    async addIdp(idp: IdpFormInput): Promise<void> {
        await test.step(`wallet gateway: add identity provider ${idp.id}`, async () => {
            await this.gotoIdentityProvidersPage()
            const popup = await this.page()

            const newButton = popup.getByRole('button', {
                name: 'New',
                exact: true,
            })
            await expect(
                newButton,
                'an admin should be offered a way to add an identity provider'
            ).toBeVisible()
            await newButton.click()

            await expect(
                popup.getByRole('heading', {
                    name: 'Add a new identity provider',
                }),
                'clicking New should open the identity provider form'
            ).toBeVisible()

            await this.fillIdpForm(idp)

            await popup
                .getByRole('button', { name: 'Add', exact: true })
                .click()
            await this.waitForIdentityProvidersPageReady()
        })
    }

    async updateIdpIssuer(idpId: string, issuer: string): Promise<void> {
        await test.step(`wallet gateway: change the issuer of ${idpId} to ${issuer}`, async () => {
            await this.openIdpReview(idpId)
            const popup = await this.page()

            await popup.locator('#idp-issuer').fill(issuer)
            await popup
                .getByRole('button', { name: 'Update', exact: true })
                .click()
            await this.waitForIdentityProvidersPageReady()
        })
    }

    async findIdpCard(idpId: string): Promise<Locator> {
        await this.waitForIdentityProvidersPageReady()
        return this.findInPaginatedList(
            `Identity provider card for "${idpId}"`,
            (popup) => popup.locator('idp-card').filter({ hasText: idpId })
        )
    }

    async expectFirstIdpNotEditable(): Promise<void> {
        await test.step('wallet gateway: the listed identity providers cannot be edited', async () => {
            const popup = await this.page()
            await this.waitForIdentityProvidersPageReady()

            const firstCard = popup.locator('idp-card').first()
            await expect(
                firstCard,
                'the identity providers page should list at least one provider'
            ).toBeVisible()

            await expect(
                firstCard.locator('.idp-card.readonly'),
                'a non-admin should see the identity provider card rendered read-only'
            ).toBeVisible()

            await firstCard.click()

            await expect(
                popup.getByRole('heading', {
                    name: 'Review Identity Provider',
                }),
                'clicking a read-only identity provider card should not open the review form'
            ).toHaveCount(0)
            await expect(
                popup.getByRole('heading', { name: 'Identity Providers' }),
                'the identity provider list should still be shown after clicking a read-only card'
            ).toBeVisible()
        })
    }

    private async openIdpReview(idpId: string): Promise<void> {
        const card = await this.findIdpCard(idpId)
        await card.click()

        const popup = await this.page()
        await expect(
            popup.getByRole('heading', { name: 'Review Identity Provider' }),
            `clicking the card for ${idpId} should open its review form`
        ).toBeVisible()
    }

    private async fillIdpForm(idp: IdpFormInput): Promise<void> {
        const popup = await this.page()

        await popup.locator('#idp-id').fill(idp.id)
        await popup.locator('#idp-type').selectOption(idp.type)
        if (idp.type !== 'self_issued') {
            await popup.locator('#idp-issuer').fill(idp.issuer)
        }
        if (idp.type === 'oauth') {
            if (!idp.configUrl) {
                throw new Error('configUrl is required for oauth IDPs')
            }
            await popup.locator('#idp-config-url').fill(idp.configUrl)
        }
    }

    private async waitForIdentityProvidersPageReady(): Promise<void> {
        const popup = await this.page()
        await expect(
            popup.getByRole('heading', { name: 'Identity Providers' }),
            'the identity providers page should have rendered'
        ).toBeVisible()
        await expect(
            popup.locator('idp-card').first(),
            'the identity providers page should have finished loading its first provider'
        ).toBeVisible()
    }

    async expectActivityWithStatus(
        commandId: string,
        status: ActivityStatus
    ): Promise<void> {
        await test.step(`wallet gateway: activity for ${commandId} is ${status}`, async () => {
            await this.reopenActivitiesPage()
            const card = await this.findActivityCard(commandId)
            await expect(
                card.locator('.status-badge'),
                `the wallet activity for ${commandId} should be ${status}`
            ).toHaveText(status)
        })
    }

    // Rejecting deletes the transaction, so the effect to look for is the
    // activity being gone. Activities are listed newest first and this one was
    // created moments ago, so the first page is where it would be had it stayed.
    async expectActivityRemoved(commandId: string): Promise<void> {
        await test.step(`wallet gateway: activity for ${commandId} is gone`, async () => {
            await this.reopenActivitiesPage()
            const popup = await this.page()
            await expect(
                popup.getByRole('button', {
                    name: `Open activity ${commandId}`,
                }),
                `rejecting ${commandId} should have removed it from the activity list`
            ).toHaveCount(0)
        })
    }

    // A popup closes itself after the approval it was opened for, so it has to
    // be brought back before its activity list can be read.
    private async reopenActivitiesPage(): Promise<void> {
        if (this.isPopup && !(await this.isPopupOpen())) {
            await this.openPopup()
        }
        await this.gotoActivitiesPage()
    }

    async gotoActivitiesPage(): Promise<void> {
        const popup = await this.page()
        await popup.locator('button[aria-haspopup="menu"]').click()
        await popup
            .getByRole('button', { name: 'Activities', exact: true })
            .click()
        await this.waitForActivitiesPageReady()
    }

    private async findActivityCard(commandId: string): Promise<Locator> {
        await this.waitForActivitiesPageReady()
        const popup = await this.page()
        return this.findInPaginatedList(
            `Activity card for command id "${commandId}"`,
            (page) =>
                page.getByRole('button', {
                    name: `Open activity ${commandId}`,
                }),
            {
                afterPageChange: async () => {
                    await expect(
                        popup.getByText('Loading activities...'),
                        'the next page of activities should have finished loading'
                    ).not.toBeVisible()
                },
            }
        )
    }

    private async waitForActivitiesPageReady(): Promise<void> {
        const popup = await this.page()
        await expect(
            popup.getByRole('heading', { name: 'Activities' }),
            'the activities page should have rendered'
        ).toBeVisible()
        await expect(
            popup.getByText('Loading activities...'),
            'the activities page should have finished loading'
        ).not.toBeVisible()
    }
}
