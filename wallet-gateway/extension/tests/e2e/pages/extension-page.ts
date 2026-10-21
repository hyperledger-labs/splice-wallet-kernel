// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Page } from '@playwright/test'
import { expect } from '../fixtures.js'

const PING_TEMPLATE = 'canton-builtin-admin-workflow-ping'

export class ExtensionPage {
    constructor(
        private readonly page: Page,
        private readonly extensionId: string
    ) {}

    private extensionUrl(path: string): string {
        return `chrome-extension://${this.extensionId}/${path}`
    }

    async loginWithLocalOAuth(): Promise<void> {
        await this.page.waitForURL(/\/login\.html$/)
        await expect(
            this.page.getByRole('heading', { name: 'Wallet Gateway' })
        ).toBeVisible()

        const network = this.page.getByLabel('Select a network')
        await expect(network).toBeEnabled()
        await network.selectOption({ label: 'Local (OAuth IDP)' })
        await this.page.getByRole('button', { name: 'Connect' }).click()

        await this.page.waitForURL(/\/parties\.html(?:\?.*)?$/, {
            timeout: 30_000,
        })
        await expect(
            this.page.getByRole('heading', { name: 'Parties' })
        ).toBeVisible()
    }

    async createPrimaryParty(partyHint: string): Promise<string> {
        await this.page.goto(this.extensionUrl('parties-add.html'))
        await expect(
            this.page.getByRole('heading', { name: 'Create a new party' })
        ).toBeVisible()

        await this.page.getByLabel('Party ID Hint').fill(partyHint)
        await this.page
            .getByLabel('Signing Provider')
            .selectOption('wallet-kernel')
        await this.page.getByLabel('Set as primary wallet').check()
        await this.page.getByRole('button', { name: 'Create party' }).click()

        await this.page.waitForURL(/\/parties\.html(?:\?.*)?$/, {
            timeout: 60_000,
        })
        await expect(this.page.getByText('Party created')).toBeVisible()

        const card = this.page
            .locator('wg-wallet-card, [data-testid="wallet-card"]')
            .filter({ hasText: partyHint })
        await expect(card).toHaveCount(1)
        await expect(card.getByText('PRIMARY')).toBeVisible()
        await expect(card.getByText('CanActAs')).toBeVisible()

        const partyId = await card.getAttribute('party-id')
        if (!partyId?.startsWith(`${partyHint}::`)) {
            throw new Error(
                `Expected an allocated party ID for ${partyHint}, got ${partyId ?? 'none'}`
            )
        }
        return partyId
    }

    async openNextApproval(): Promise<string> {
        await this.page.goto(this.extensionUrl('popup.html'))
        await this.page.waitForURL(/\/approve\.html\?.*transactionId=/)

        const commandId = new URL(this.page.url()).searchParams.get('commandId')
        if (!commandId) {
            throw new Error('The approval URL did not contain a command ID')
        }
        return commandId
    }

    async approvePendingPing(
        partyId: string,
        commandId: string
    ): Promise<void> {
        await expect(
            this.page.getByRole('heading', { name: 'Activity Details' })
        ).toBeVisible()
        await expect(
            this.page.getByText('pending', { exact: true })
        ).toBeVisible()
        await expect(
            this.page.getByText(commandId, { exact: true })
        ).toBeVisible()
        await expect(this.page.getByText(PING_TEMPLATE)).toBeVisible()
        await expect(
            this.page.getByText(partyId, { exact: true })
        ).toBeVisible()
        await expect(
            this.page.getByRole('button', { name: 'Approve' })
        ).toBeEnabled()

        await this.page.getByRole('button', { name: 'Approve' }).click()
        await expect(
            this.page.getByText('Activity executed successfully')
        ).toBeVisible({ timeout: 60_000 })
        await this.page.waitForURL(
            (url) => !url.pathname.endsWith('/approve.html')
        )
    }
}
