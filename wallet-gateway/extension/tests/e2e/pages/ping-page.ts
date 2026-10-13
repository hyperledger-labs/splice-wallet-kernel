// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { openWalletPicker } from '@canton-network/core-wallet-test-utils'
import type { Locator, Page } from '@playwright/test'
import { expect } from '../fixtures.js'

const CANTON_WALLET_GATEWAY_ID = 'browser:ext:canton-wallet'

export class PingPage {
    constructor(private readonly page: Page) {}

    async expectDisconnected(): Promise<void> {
        await expect(this.page).toHaveTitle(/Example dApp/)
        await expect(
            this.page.getByTestId('connection-indicator-disconnected')
        ).toBeVisible()
        await expect(this.page.getByTestId('connect-wallet')).toBeVisible()
    }

    async connectToExtension(): Promise<void> {
        const picker = await openWalletPicker(
            this.page,
            this.page.getByTestId('connect-wallet')
        )
        const wallet = picker.getByRole('button', {
            name: 'Connect to Canton Wallet',
        })
        await expect(wallet).toBeVisible()
        await expect(picker.getByLabel('Install Canton Wallet')).toHaveCount(0)

        const pickerClosed = picker.waitForEvent('close')
        await wallet.click()
        await pickerClosed

        await expect(async () => {
            expect(await this.page.getByTestId('connect-wallet').count()).toBe(
                0
            )
            expect(await this.page.getByTestId('open-wallet').isEnabled()).toBe(
                true
            )
            expect(
                await this.page
                    .getByTestId('connection-indicator-connected')
                    .isVisible()
            ).toBe(true)
            expect(
                await this.page.getByTestId('connected-gateway').textContent()
            ).toBe(CANTON_WALLET_GATEWAY_ID)
            expect(await this.page.locator('p.error').count()).toBe(0)
        }).toPass({ timeout: 10_000 })
    }

    async expectAccount(partyId: string): Promise<void> {
        await this.page.getByRole('button', { name: 'Accounts' }).click()
        const account = this.page
            .getByRole('listitem')
            .filter({ hasText: partyId })
        await expect(account).toBeVisible()
        await expect(account).toContainText('(primary)')
    }

    async preparePingContract(): Promise<Locator> {
        await this.page
            .getByRole('button', { name: 'Ledger Submission' })
            .click()
        const createButton = this.page.getByRole('button', {
            name: 'create Ping contract',
            exact: true,
        })
        await expect(createButton).toBeEnabled()
        await createButton.click()
        await expect(createButton).toBeEnabled({ timeout: 30_000 })
        await expect(this.page.locator('p.error')).toHaveCount(0)
        return createButton
    }

    /**
     * Expect the Ledger Submission panel to list the statuses of the
     * `txChanged` events received for a command, oldest first.
     */
    async expectTxChangedEvents(
        commandId: string,
        statuses: string[]
    ): Promise<void> {
        await this.page
            .getByRole('button', { name: 'Ledger Submission' })
            .click()
        // Each received event is rendered as pretty-printed JSON, newest first.
        const events = this.page
            .locator('.terminal-display pre > p')
            .filter({ hasText: `"commandId": "${commandId}"` })

        await expect(async () => {
            const observed = (await events.allTextContents())
                .map((text) => (JSON.parse(text) as { status: string }).status)
                .reverse()
            expect(observed).toEqual(statuses)
        }).toPass({ timeout: 15_000 })
    }

    async expectNoSubmissionError(): Promise<void> {
        await expect(this.page.locator('p.error')).toHaveCount(0)
    }
}
