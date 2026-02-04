// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    test,
    expect,
    WalletGateway,
} from '@canton-network/core-wallet-test-utils'
import { Page } from '@playwright/test'
const dappApiPort = 3030

test('dApp: execute externally signed tx', async ({
    page: dappPage,
}: {
    page: Page
}) => {
    const wg = new WalletGateway({
        dappPage,
        openButton: (page) =>
            page.getByRole('button', {
                name: 'open Wallet Gateway',
            }),
        connectButton: (page) =>
            page.getByRole('button', {
                name: 'connect to Wallet Gateway',
            }),
    })
    await dappPage.goto('http://localhost:8080/')

    // Expect a title "to contain" a substring.
    await expect(dappPage).toHaveTitle(/Example dApp/)

    console.log('connecting...')
    await wg.connect({
        customURL: `http://localhost:${dappApiPort}/api/v0/dapp`,
        network: 'Local (OAuth IDP)',
    })
    console.log('connected...')

    await expect(dappPage.getByText('Loading...')).toHaveCount(0)

    await expect(dappPage.getByText(/.*gateway: remote-da*/)).toBeVisible()

    const party1 = `test-${Date.now()}`
    const party2 = `test-${Date.now() + 1}`

    // Create a participant party named `test1`
    await wg.createWalletIfNotExists({
        partyHint: party1,
        signingProvider: 'participant',
    })
    await wg.createWalletIfNotExists({
        partyHint: party2,
        signingProvider: 'wallet-kernel',
        primary: true,
    })

    //press accounts tab
    await dappPage.getByRole('button', { name: 'Accounts' }).click()

    await expect(dappPage.getByText(`${party2}::`)).toBeDefined()

    //press ledger submission
    await dappPage.getByRole('button', { name: 'Ledger Submission' }).click()

    await expect(
        dappPage.getByRole('button', { name: 'create Ping contract' })
    ).toBeEnabled()

    // Create a Ping contract through the dapp with the new party
    const commandId = await wg.approveTransaction(() =>
        dappPage.getByRole('button', { name: 'create Ping contract' }).click()
    )

    await expect(
        dappPage.getByRole('paragraph').filter({
            hasText: `{ "status": "pending", "commandId": "${commandId.commandId}" }`,
        })
    ).toHaveCount(1)
    await expect(
        dappPage.getByRole('paragraph').filter({
            hasText: `{ "commandId": "${commandId.commandId}", "status": "signed", "`,
        })
    ).toHaveCount(1)
    await expect(
        dappPage.getByRole('paragraph').filter({
            hasText: `{ "commandId": "${commandId.commandId}", "status": "executed", "`,
        })
    ).toHaveCount(1)
})
