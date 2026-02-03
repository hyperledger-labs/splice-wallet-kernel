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

    const accounts = dappPage.getByTestId('accounts')
    const postEvents = dappPage.getByTestId('post-events')
    await expect(accounts.getByText(new RegExp(`${party2}::.*`))).toBeVisible()
    await expect(postEvents.getByText(new RegExp(`${party2}::.*`))).toBeVisible()
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
    await expect(dappPage.getByText('executed')).toHaveCount(2)
})

test('connection status handling', async ({ page: dappPage }) => {
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

    await expect(dappPage).toHaveTitle(/Example dApp/)

    const connectButton = dappPage.getByRole('button', {
        name: 'connect to Wallet Gateway',
    })
    await expect(connectButton).toBeVisible()

    console.log('connecting...')
    await wg.connect({
        customURL: `http://localhost:${dappApiPort}/api/v0/dapp`,
        network: 'Local (OAuth IDP)',
    })
    console.log('connected...')

    await expect(dappPage.getByText('Loading...')).toHaveCount(0)

    await expect(dappPage.getByText(/.*connected: 🟢*/)).toBeVisible()

    const disconnectButton = dappPage.getByRole('button', {
        name: 'disconnect',
    })
    await expect(disconnectButton).toBeVisible()
    await expect(connectButton).not.toBeVisible()

    await wg.disconnect()

    await expect(dappPage.getByText(/.*connected: 🔴*/)).toBeVisible()

    await expect(connectButton).toBeVisible()
    await expect(disconnectButton).not.toBeVisible()
})

test('reconnect after disconnect', async ({ page: dappPage }) => {
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

    await expect(dappPage).toHaveTitle(/Example dApp/)

    const connectButton = dappPage.getByRole('button', {
        name: 'connect to Wallet Gateway',
    })

    // First connection
    console.log('connecting...')
    await wg.connect({
        customURL: `http://localhost:${dappApiPort}/api/v0/dapp`,
        network: 'Local (OAuth IDP)',
    })
    console.log('connected...')

    await expect(dappPage.getByText('Loading...')).toHaveCount(0)
    await expect(dappPage.getByText(/.*connected: 🟢*/)).toBeVisible()

    const disconnectButton = dappPage.getByRole('button', {
        name: 'disconnect',
    })
    await expect(disconnectButton).toBeVisible()

    // Disconnect
    await wg.disconnect()
    await expect(dappPage.getByText(/.*connected: 🔴*/)).toBeVisible()
    await expect(connectButton).toBeVisible()

    // Reconnect
    await wg.reconnect({
        customURL: `http://localhost:${dappApiPort}/api/v0/dapp`,
        network: 'Local (OAuth IDP)',
    })

    await expect(dappPage.getByText('Loading...')).toHaveCount(0)
    await expect(dappPage.getByText(/.*connected: 🟢*/)).toBeVisible()
    await expect(disconnectButton).toBeVisible()
    await expect(connectButton).not.toBeVisible()
})

test('comprehensive connection status handling', async ({ page: dappPage }) => {
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

    await expect(dappPage).toHaveTitle(/Example dApp/)

    const connectButton = dappPage.getByRole('button', {
        name: 'connect to Wallet Gateway',
    })
    const disconnectButton = dappPage.getByRole('button', {
        name: 'disconnect',
    })

    // 1. Connect to a gateway -- ensure status is updated
    await expect(connectButton).toBeVisible()
    await wg.connect({
        customURL: `http://localhost:${dappApiPort}/api/v0/dapp`,
        network: 'Local (OAuth IDP)',
    })
    await expect(dappPage.getByText('Loading...')).toHaveCount(0)
    await expect(dappPage.getByText(/.*connected: 🟢*/)).toBeVisible()
    await expect(disconnectButton).toBeVisible()
    await expect(connectButton).not.toBeVisible()

    // 2. Hit disconnect button -- ensure status is updated
    await wg.disconnect()
    await expect(dappPage.getByText(/.*connected: 🔴*/)).toBeVisible()
    await expect(connectButton).toBeVisible()
    await expect(disconnectButton).not.toBeVisible()

    // 3. Reconnect
    await wg.reconnect({
        customURL: `http://localhost:${dappApiPort}/api/v0/dapp`,
        network: 'Local (OAuth IDP)',
    })
    await expect(dappPage.getByText('Loading...')).toHaveCount(0)
    await expect(dappPage.getByText(/.*connected: 🟢*/)).toBeVisible()
    await expect(disconnectButton).toBeVisible()
    await expect(connectButton).not.toBeVisible()

    // 4. Hit logout button inside popup
    await wg.logoutFromPopup()
    await expect(dappPage.getByText(/.*connected: 🔴*/)).toBeVisible()
    await expect(connectButton).toBeVisible()
    await expect(disconnectButton).not.toBeVisible()

    // 5. Reconnect
    await wg.reconnect({
        customURL: `http://localhost:${dappApiPort}/api/v0/dapp`,
        network: 'Local (OAuth IDP)',
    })
    await expect(dappPage.getByText('Loading...')).toHaveCount(0)
    await expect(dappPage.getByText(/.*connected: 🟢*/)).toBeVisible()
    await expect(disconnectButton).toBeVisible()
    await expect(connectButton).not.toBeVisible()

    // 6. Refresh page -- ensure still connected & popup is closed
    await dappPage.reload()
    await expect(dappPage).toHaveTitle(/Example dApp/)
    await expect(dappPage.getByText('Loading...')).toHaveCount(0)
    await expect(dappPage.getByText(/.*connected: 🟢*/)).toBeVisible()
    await expect(disconnectButton).toBeVisible()
    await expect(connectButton).not.toBeVisible()
    // Verify popup is closed
    const isPopupOpen = await wg.isPopupOpen()
    expect(isPopupOpen).toBe(false)

    // 7. Open popup
    await wg.openPopup()
    const popupOpenAfterOpen = await wg.isPopupOpen()
    expect(popupOpenAfterOpen).toBe(true)
    // Verify still connected
    await expect(dappPage.getByText(/.*connected: 🟢*/)).toBeVisible()

    // 8. Close popup -- ensure still connected
    await wg.closePopup()
    await expect(dappPage.getByText(/.*connected: 🟢*/)).toBeVisible()
    await expect(disconnectButton).toBeVisible()
    await expect(connectButton).not.toBeVisible()

    // 9. Disconnect while popup closed -- ensure disconnected
    await wg.disconnect()
    await expect(dappPage.getByText(/.*connected: 🔴*/)).toBeVisible()
    await expect(connectButton).toBeVisible()
    await expect(disconnectButton).not.toBeVisible()
})
