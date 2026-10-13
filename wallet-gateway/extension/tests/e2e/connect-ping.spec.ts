// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { test } from './fixtures.js'
import { ExtensionPage, PingPage } from './pages/index.js'

test('creates and approves a Ping contract with the Canton Wallet extension', async ({
    dappPage,
    extensionId,
    extensionPage,
}) => {
    const extension = new ExtensionPage(extensionPage, extensionId)
    const ping = new PingPage(dappPage)
    const partyHint = `extension-e2e-${Date.now()}`

    await test.step('log in to the extension with local OAuth', async () => {
        await extension.loginWithLocalOAuth()
    })

    const partyId =
        await test.step('create an allocated primary wallet-kernel party', () =>
            extension.createPrimaryParty(partyHint))

    await test.step('connect Ping to the installed extension', async () => {
        await ping.expectDisconnected()
        await ping.connectToExtension()
    })

    await test.step('Ping lists the extension primary party', async () => {
        await ping.expectAccount(partyId)
    })

    await test.step('prepare a Ping contract for approval', async () => {
        await ping.preparePingContract()
    })

    const commandId =
        await test.step('open the queued approval through the extension popup', () =>
            extension.openNextApproval())

    await test.step('approve and execute the Ping contract', async () => {
        await extension.approvePendingPing(partyId, commandId)
    })

    await test.step('Ping reports no submission failure', async () => {
        await ping.expectNoSubmissionError()
    })

    await test.step('Ping receives the transaction lifecycle events', async () => {
        await ping.expectTxChangedEvents(commandId, [
            'pending',
            'signed',
            'executed',
        ])
    })
})
