// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    test,
    expect,
    type WalletGateway,
} from '@canton-network/core-wallet-test-utils'
import type { Page } from '@playwright/test'
import {
    createPingDappWalletGateway,
    DAPP_URL,
    expectDappConnected,
    expectDappDisconnected,
    GATEWAY_NAME,
    SELF_ISSUED_NETWORK,
} from './ping-test-helpers.js'

async function executePing(wg: WalletGateway, dappPage: Page): Promise<void> {
    const { commandId } =
        await test.step('create a Ping contract and approve it in the wallet', async () => {
            await dappPage
                .getByRole('button', { name: 'Ledger Submission' })
                .click()

            const createButton = dappPage.getByRole('button', {
                name: 'create Ping contract',
                exact: true,
            })
            await expect(
                createButton,
                'the dApp should be ready to submit a Ping contract'
            ).toBeEnabled()

            return wg.approveTransaction(() => createButton.click())
        })

    await test.step('the dApp reports the transaction pending, signed and executed', async () => {
        const events = (status: string) =>
            dappPage
                .getByRole('paragraph')
                .filter({ hasText: `"commandId": "${commandId}"` })
                .filter({ hasText: `"status": "${status}"` })

        await expect(
            events('pending'),
            'the dApp should report the transaction as pending'
        ).toHaveCount(1)
        await expect(
            events('signed'),
            'the dApp should report the transaction as signed'
        ).toHaveCount(1)
        await expect(
            events('executed').filter({
                hasText:
                    /"payload": \{[\s\S]*"updateId": "[^"]+"[\s\S]*"completionOffset": \d+/,
            }),
            'the dApp should report the transaction as executed, with an update id and completion offset'
        ).toHaveCount(1)
    })

    await test.step('the wallet lists the transaction as executed', async () => {
        await wg.expectActivityWithStatus(commandId, 'executed')
    })
}

test('self-issued onboarding creates an authentication party, executes a ping, then reconnects as that user and executes another', async ({
    page: dappPage,
}: {
    page: Page
}) => {
    // TODO: remove this skip, and the NETWORK env on the ping-e2e job, once Canton 3.6 is in mainnet.
    test.skip(
        process.env.NETWORK === 'mainnet',
        'self-issued auth requires Canton 3.6, which mainnet does not run yet'
    )

    const wg = createPingDappWalletGateway(dappPage)
    const username = `self-issued-${Date.now()}`
    const partyHint = `auth-${Date.now()}`

    await test.step('open the ping dApp', async () => {
        await dappPage.goto(DAPP_URL)
        await expect(dappPage).toHaveTitle(/Example dApp/)
    })

    await wg.connectToSelfIssuedNetwork({
        network: SELF_ISSUED_NETWORK,
        username,
    })

    const partyId = await wg.submitSelfIssuedOnboarding({
        expectedNetwork: SELF_ISSUED_NETWORK,
        partyHint,
        signingProvider: 'wallet-kernel',
    })

    await expectDappConnected(dappPage, GATEWAY_NAME)

    await wg.setPrimaryWallet(partyId)

    await test.step('the dApp lists the authentication party under Accounts', async () => {
        await dappPage.getByRole('button', { name: 'Accounts' }).click()
        await expect(
            dappPage.getByText(`${partyHint}::`).filter({ visible: true }),
            `the Accounts tab should list ${partyHint}`
        ).toHaveCount(1)
    })

    await executePing(wg, dappPage)

    await test.step('logging out ends the session', async () => {
        await wg.logoutFromPopup()
        await expectDappDisconnected(dappPage)
    })

    await wg.connectToSelfIssuedNetwork({
        network: SELF_ISSUED_NETWORK,
        username,
    })

    await wg.selectSelfIssuedAuthenticationParty({
        expectedNetwork: SELF_ISSUED_NETWORK,
        partyId,
    })

    await expectDappConnected(dappPage, GATEWAY_NAME)

    await test.step('the dApp lists the existing authentication party under Accounts', async () => {
        await dappPage.getByRole('button', { name: 'Accounts' }).click()
        await expect(
            dappPage.getByText(partyId).filter({ visible: true }),
            `the Accounts tab should list ${partyId}`
        ).toHaveCount(1)
    })

    await executePing(wg, dappPage)
})
