// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    test,
    expect,
    WalletGateway,
} from '@canton-network/core-wallet-test-utils'
const dappApiPort = 3030

test('connection status handling edge cases', async ({ page: dappPage }) => {
    const wg = new WalletGateway({
        dappPage,
        openButton: (page) =>
            page.getByRole('button', {
                name: 'open Wallet',
            }),
        connectButton: (page) =>
            page.getByRole('button', {
                name: 'connect to Wallet',
            }),
    })
    await dappPage.goto('http://localhost:8080/')

    await expect(dappPage).toHaveTitle(/Example dApp/)

    const connectButton = dappPage.getByRole('button', {
        name: 'connect to Wallet',
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
    await expect(disconnectButton).toBeVisible()
    await expect(connectButton).not.toBeVisible()

    // 2. Hit disconnect button -- ensure status is updated
    await expect(disconnectButton).toBeVisible()
    await disconnectButton.click()
    await expect(dappPage.getByText('Loading...')).toHaveCount(0)
    await expect(connectButton).toBeVisible()
    await expect(disconnectButton).not.toBeVisible()

    // 3. Reconnect
    await wg.connect({
        customURL: `http://localhost:${dappApiPort}/api/v0/dapp`,
        network: 'Local (OAuth IDP)',
    })
    await expect(dappPage.getByText('Loading...')).toHaveCount(0)
    await expect(disconnectButton).toBeVisible()
    await expect(connectButton).not.toBeVisible()

    // 4. Hit logout button inside popup
    await wg.logoutFromPopup()
    await expect(connectButton).toBeVisible()
    await expect(disconnectButton).not.toBeVisible()

    // 5. Reconnect
    await wg.connect({
        customURL: `http://localhost:${dappApiPort}/api/v0/dapp`,
        network: 'Local (OAuth IDP)',
    })
    await expect(dappPage.getByText('Loading...')).toHaveCount(0)
    await expect(disconnectButton).toBeVisible()
    await expect(connectButton).not.toBeVisible()

    // 6. Refresh page -- ensure still connected & popup is closed
    await dappPage.reload()
    await expect(dappPage).toHaveTitle(/Example dApp/)
    await expect(dappPage.getByText('Loading...')).toHaveCount(0)
    await expect(disconnectButton).toBeVisible()
    await expect(connectButton).not.toBeVisible()
    // Verify popup is closed
    expect(wg.popup.isOpen()).toBe(false)

    // 7. Open popup
    await wg.popup.open()
    const popupOpenAfterOpen = await wg.popup.isOpen()
    expect(popupOpenAfterOpen).toBe(true)
    // Verify still connected
    await expect(disconnectButton).toBeVisible()
    await expect(connectButton).not.toBeVisible()

    // 8. Close popup -- ensure still connected
    await wg.popup.close()
    await expect(disconnectButton).toBeVisible()
    await expect(connectButton).not.toBeVisible()

    // 9. Disconnect while popup closed -- ensure disconnected
    await expect(disconnectButton).toBeVisible()
    await disconnectButton.click()
    await expect(dappPage.getByText('Loading...')).toHaveCount(0)
    await expect(connectButton).toBeVisible()
    await expect(disconnectButton).not.toBeVisible()
})
