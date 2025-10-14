// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { test, expect } from '@playwright/test'

const dappApiPort = process.env.DAPP_API_PORT ?? 3008

test('dApp: execute externally signed tx', async ({ page: dappPage }) => {
    await dappPage.goto('http://localhost:8080/')

    // Expect a title "to contain" a substring.
    await expect(dappPage).toHaveTitle(/Example dApp/)

    const discoverPopupPromise = dappPage.waitForEvent('popup')

    await dappPage
        .getByRole('button', { name: 'connect to Wallet Gateway' })
        .click()

    const discoverPopup = await discoverPopupPromise

    // Connect to remote Wallet Gateway
    await discoverPopup
        .getByRole('textbox', { name: 'RPC URL' })
        .fill(`http://localhost:${dappApiPort}/rpc`)

    await discoverPopup.getByRole('button', { name: 'Connect' }).nth(1).click()

    const wkPage = await dappPage.waitForEvent('popup')

    try {
        await wkPage.locator('#network').selectOption('1')
        await wkPage.getByRole('button', { name: 'Connect' }).click()

        await expect(dappPage.getByText('Loading...')).toHaveCount(0)

        await expect(dappPage.getByText(/.*status: connected.*/)).toBeVisible()

        const party1 = `test-${Date.now()}`
        const party2 = `test-${Date.now() + 1}`

        // Create a participant party named `test1`
        await wkPage.getByRole('button', { name: 'Create New' }).click()

        await wkPage.getByRole('textbox', { name: 'Party ID hint:' }).click()
        await wkPage
            .getByRole('textbox', { name: 'Party ID hint:' })
            .fill(party1)
        await wkPage.getByLabel('Signing Provider:').selectOption('participant')
        await wkPage.getByLabel('Network:').selectOption('canton:local-oauth')

        await wkPage.getByRole('button', { name: 'Create' }).click()

        // Create a kernel party named `test2`
        await wkPage.getByRole('textbox', { name: 'Party ID hint:' }).click()
        await wkPage
            .getByRole('textbox', { name: 'Party ID hint:' })
            .fill(party2)
        await wkPage
            .getByLabel('Signing Provider:')
            .selectOption('wallet-kernel')

        await wkPage.getByRole('checkbox', { name: 'primary' }).check()
        await wkPage.getByRole('button', { name: 'Create' }).click()

        // Wait for parties to be allocated
        await expect(wkPage.getByText(party1)).toHaveCount(2)
        await expect(wkPage.getByText(party2)).toHaveCount(2)

        //TODO: figure out why we need to reload the page
        await dappPage.reload()

        await expect(
            dappPage.getByText(new RegExp(`primary party: ${party2}::.*`))
        ).toBeVisible()
        await expect(
            dappPage.getByRole('button', { name: 'create Ping contract' })
        ).toBeEnabled()

        // Create a Ping contract through the dapp with the new party
        await dappPage
            .getByRole('button', { name: 'create Ping contract' })
            .click()
        await expect(
            wkPage.getByRole('heading', { name: 'Pending Transaction Request' })
        ).toBeVisible()

        const id = new URL(wkPage.url()).searchParams.get('commandId')

        await wkPage.getByRole('button', { name: 'Approve' }).click()

        // Wait for command to have fully executed
        await expect(
            dappPage
                .getByText(`{"commandId":"${id}","status":"executed","`)
                .first()
        ).toBeVisible()
    } catch (e) {
        await dappPage.screenshot({ path: 'error-dapp.png' })
        await wkPage.screenshot({ path: 'error-wk.png' })
        throw e
    }
})
