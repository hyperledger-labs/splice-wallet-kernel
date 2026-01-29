// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { test, expect } from '@playwright/test'
import { WalletGateway } from '@canton-network/core-wallet-test-utils'

const dappApiPort = 3030

test('dApp: execute externally signed tx', async ({ page: dappPage }) => {
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

    await expect(dappPage.getByText(/.*connected: 🟢*/)).toBeVisible()

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

    //TODO: figure out why we need to reload the page
    await dappPage.reload()

    await expect(dappPage.getByText(new RegExp(`${party2}::.*`))).toBeVisible()
    await expect(
        dappPage.getByRole('button', { name: 'create Ping contract' })
    ).toBeEnabled()

    // Create a Ping contract through the dapp with the new party
    await wg.approveTransaction(() =>
        dappPage.getByRole('button', { name: 'create Ping contract' }).click()
    )

    // Wait for command to have fully executed
    //TODO: we use 2 because we have one in the transaction list and one in the event list
    //TODO: fix this so we check each list properly once
    await expect(dappPage.getByText("executed")).toHaveCount(2)
})
