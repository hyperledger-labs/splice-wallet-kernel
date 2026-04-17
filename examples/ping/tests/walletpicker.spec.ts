// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    test,
    expect,
    WalletGateway,
} from '@canton-network/core-wallet-test-utils'
import { Page } from '@playwright/test'
const dappApiPort = 3030

test('wallet picker: handling error cases', async ({
    page: dappPage,
}: {
    page: Page
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

    // Expect a title "to contain" a substring.
    await expect(dappPage).toHaveTitle(/Example dApp/)

    const connectButton = dappPage.getByRole('button', {
        name: 'connect to Wallet',
    })
    const disconnectButton = dappPage.getByRole('button', {
        name: 'disconnect',
    })

    // 1. Connect via custom wallet API URL and verify connected status.
    await wg.connect({
        customURL: `http://localhost:${dappApiPort}/api/v0/dapp`,
        network: 'Local (OAuth IDP)',
    })
    await expect(dappPage.getByText('Loading...')).toHaveCount(0)
    await expect(disconnectButton).toBeVisible()
    await expect(connectButton).not.toBeVisible()

    // 2. Logout from the popup and verify disconnected status.
    await wg.logoutFromPopup()
    await expect(connectButton).toBeVisible()
    await expect(disconnectButton).not.toBeVisible()

    // 3. Enter an invalid URL, recover via "Try Again", and connect injected.
    await expect(dappPage.getByText('Loading...')).toHaveCount(0)
    await expect(connectButton).toBeEnabled()
    const discoverPopupPromise = dappPage.waitForEvent('popup')
    await connectButton.click()
    const pickerPopup = await discoverPopupPromise

    await pickerPopup
        .getByRole('textbox', { name: 'Wallet API URL' })
        .fill('thisisnotarealurl')
    await pickerPopup
        .getByRole('button', { name: 'Connect', exact: true })
        .click()
    await expect(
        pickerPopup.getByRole('button', {
            name: 'Try Again',
        })
    ).toBeVisible()
    await pickerPopup.getByRole('button', { name: 'Try Again' }).click()
    await expect(
        pickerPopup.getByRole('button', {
            name: 'Connect to thisisnotarealurl',
        })
    ).toHaveCount(0)
})
