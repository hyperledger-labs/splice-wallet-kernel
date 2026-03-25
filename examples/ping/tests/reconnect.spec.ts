// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    test,
    expect,
    WalletGateway,
} from '@canton-network/core-wallet-test-utils'
const dappApiPort = 3030

test('popup opens with correct userUrl after reconnect', async ({
    page: dappPage,
}) => {
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

    // 1. Login
    await wg.connect({
        customURL: `http://localhost:${dappApiPort}/api/v0/dapp`,
        network: 'Local (OAuth IDP)',
    })
    await expect(dappPage.getByText('Loading...')).toHaveCount(0)
    await expect(disconnectButton).toBeVisible()
    await expect(connectButton).not.toBeVisible()

    // 2. Disconnect
    await expect(disconnectButton).toBeVisible()
    await disconnectButton.click()
    await expect(dappPage.getByText('Loading...')).toHaveCount(0)
    await expect(connectButton).toBeVisible()
    await expect(disconnectButton).not.toBeVisible()

    // 3. Login again
    await wg.connect({
        customURL: `http://localhost:${dappApiPort}/api/v0/dapp`,
        network: 'Local (OAuth IDP)',
    })
    await expect(dappPage.getByText('Loading...')).toHaveCount(0)
    await expect(disconnectButton).toBeVisible()
    await expect(connectButton).not.toBeVisible()

    // 4. Open wallet and verify it opens with proper userUrl (not dApp URL)
    await wg.popup.close()
    await wg.popup.open()
    await wg.popup.waitForURL(new RegExp(`localhost:${dappApiPort}`))
})
