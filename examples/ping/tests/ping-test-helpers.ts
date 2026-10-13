// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Shared tests methods for dapp scope

import {
    expect,
    test,
    WalletGateway,
    type ExternalSigningProvider,
} from '@canton-network/core-wallet-test-utils'
import type { Page } from '@playwright/test'

export const DAPP_API_PORT = 3030
export const DAPP_URL = 'http://localhost:8080/'
export const DAPP_API_URL = `http://localhost:${DAPP_API_PORT}/api/v0/dapp`
export const GATEWAY_NAME = 'remote-da'
// Network whose user `operator` is the configured gateway admin.
export const DEFAULT_NETWORK = 'Local (OAuth IDP)'
export const SELF_ISSUED_NETWORK = 'Local (Self issued)'

const EXECUTED_PAYLOAD_PATTERN =
    /"payload": \{[\s\S]*"updateId": "[^"]+"[\s\S]*"completionOffset": \d+/

export function createPingDappWalletGateway(dappPage: Page): WalletGateway {
    return new WalletGateway({
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
}

export async function connectPingDapp(
    wg: WalletGateway,
    dappPage: Page,
    network: string = DEFAULT_NETWORK
): Promise<void> {
    await test.step(`open the ping dApp and connect it to ${network}`, async () => {
        await dappPage.goto(DAPP_URL)
        await expect(dappPage).toHaveTitle(/Example dApp/)

        await connectWalletGateway(wg, dappPage, network)
    })
}

// Connecting from a dApp that is already open, for instance after a disconnect.
export async function connectWalletGateway(
    wg: WalletGateway,
    dappPage: Page,
    network: string = DEFAULT_NETWORK
): Promise<void> {
    await wg.connect({ customURL: DAPP_API_URL, network })
    await expectDappConnected(dappPage, GATEWAY_NAME)
}

export async function expectDappConnected(
    dappPage: Page,
    gatewayName: string
): Promise<void> {
    await test.step(`the dApp reports a connected session with ${gatewayName}`, async () => {
        // Wrapped with expect().toPass, because buttons part depends on connectResponse, while <Status> part depends on statusEvent.
        // They come in asynchronously, wrapper mitigates race condition by waiting until every assertion in positive at the same time.
        await expect(async () => {
            const [
                connectCount,
                openEnabled,
                connectedVisible,
                connectedGateway,
                disconnectVisible,
            ] = await Promise.all([
                dappPage.getByTestId('connect-wallet').count(),
                dappPage.getByTestId('open-wallet').isEnabled(),
                dappPage
                    .getByTestId('connection-indicator-connected')
                    .isVisible(),
                dappPage.getByTestId('connected-gateway').textContent(),
                dappPage.getByTestId('disconnect-wallet').isVisible(),
            ])

            expect(
                connectCount,
                'a connected dApp should no longer has a connect button'
            ).toBe(0)

            expect(
                openEnabled,
                'a connected dApp should allow opening the wallet'
            ).toBe(true)

            expect(
                connectedVisible,
                'the dApp status line should report the wallet as connected'
            ).toBe(true)

            expect(
                connectedGateway,
                'the dApp should report the gateway it is connected to'
            ).toBe(gatewayName)

            expect(
                disconnectVisible,
                'a connected dApp should have disconnect button'
            ).toBe(true)
        }, 'dapp connected indicators from connectResult and statusEvent are all visible at the same time').toPass(
            {
                timeout: 10_000,
            }
        )
    })
}

export async function expectDappDisconnected(dappPage: Page): Promise<void> {
    await test.step('the dApp reports no wallet session', async () => {
        // Wrapped with expect().toPass, because buttons part depends on connectResponse, while <Status> part depends on statusEvent.
        // They come in asynchronously, wrapper mitigates race condition by waiting until every assertion in positive at the same time.
        await expect(async () => {
            const [
                disconnectedVisible,
                connectVisible,
                disconnectCount,
                openDisabled,
            ] = await Promise.all([
                dappPage
                    .getByTestId('connection-indicator-disconnected')
                    .isVisible(),
                dappPage.getByTestId('connect-wallet').isVisible(),
                dappPage.getByTestId('disconnect-wallet').count(),
                dappPage.getByTestId('open-wallet').isDisabled(),
            ])

            expect(
                disconnectedVisible,
                'the dApp status line should report the wallet as disconnected'
            ).toBe(true)

            expect(
                connectVisible,
                'a disconnected dApp should offer a connect button'
            ).toBe(true)

            expect(
                disconnectCount,
                'a disconnected dApp should no longer have a disconnect button'
            ).toBe(0)

            expect(
                openDisabled,
                'a disconnected dApp should not allow opening the wallet'
            ).toBe(true)
        }).toPass({
            timeout: 10_000,
        })
    })
}

export async function initializeExternalSigningParty(args: {
    wg: WalletGateway
    partyHint: string
    signingProvider: ExternalSigningProvider
    vaultName?: string
}): Promise<{ partyId: string; externalTxId: string }> {
    return test.step(`create an unallocated ${args.signingProvider} party ${args.partyHint}`, async () => {
        const partyId = await args.wg.createWalletIfNotExists({
            partyHint: args.partyHint,
            signingProvider: args.signingProvider,
            ...(args.vaultName !== undefined && { vaultName: args.vaultName }),
            primary: false,
        })

        const externalTxId = await args.wg.getWalletExternalTxId(partyId)

        return { partyId, externalTxId }
    })
}

export async function allocateExternalSigningParty(args: {
    wg: WalletGateway
    dappPage: Page
    partyHint: string
    partyId: string
}): Promise<void> {
    await test.step(`allocate ${args.partyHint} and make it the primary party`, async () => {
        await args.wg.allocateWalletParty(args.partyId)

        await args.dappPage.getByRole('button', { name: 'Accounts' }).click()
        await expect(
            args.dappPage
                .getByText(`${args.partyHint}::`)
                .filter({ visible: true }),
            `the Accounts tab should list the allocated party ${args.partyHint}`
        ).toHaveCount(1)

        await args.wg.setPrimaryWallet(args.partyId)
    })
}

export async function clickCreatePingContract(dappPage: Page): Promise<void> {
    await test.step('submit a Ping contract from the dApp', async () => {
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
        await createButton.click()
    })
}

export async function getExternalTxIdFromPendingResult(
    page: Page,
    commandId: string
): Promise<string> {
    const pendingResult = page
        .getByRole('paragraph')
        .filter({ hasText: `"commandId": "${commandId}"` })
        .filter({ hasText: '"status": "pending"' })
        .filter({ hasText: '"externalTxId"' })
        .first()

    await expect(
        pendingResult,
        `the dApp should report command ${commandId} as pending, awaiting an external signature`
    ).toBeVisible()
    const pendingText = await pendingResult.textContent()
    const externalTxId = pendingText?.match(/"externalTxId":\s*"([^"]+)"/)?.[1]
    if (!externalTxId) {
        throw new Error(
            `did not find externalTxId in pending tx response for commandId ${commandId}`
        )
    }
    return externalTxId
}

export async function createPingContractAndApproveExternal(
    wg: WalletGateway,
    dappPage: Page
): Promise<{ commandId: string; externalTxId: string }> {
    return test.step('create a Ping contract and approve it for external signing', async () => {
        const { commandId } = await wg.approveTransaction(
            () => clickCreatePingContract(dappPage),
            { isExternalSigning: true, waitForClose: false }
        )
        const externalTxId = await getExternalTxIdFromPendingResult(
            dappPage,
            commandId
        )
        return { commandId, externalTxId }
    })
}

type TxStatus = 'pending' | 'signed' | 'executed' | 'failed'

export async function expectTxStatusInDappEvents(
    dappPage: Page,
    commandId: string,
    status: TxStatus
): Promise<void> {
    let locator = dappPage
        .getByRole('paragraph')
        .filter({ hasText: `"commandId": "${commandId}"` })
        .filter({ hasText: `"status": "${status}"` })
    let description = `the dApp should report command ${commandId} as ${status}`

    if (status === 'pending' || status === 'signed') {
        locator = locator.filter({ hasText: '"externalTxId"' })
        description += ', with an external transaction id'
    }
    if (status === 'executed') {
        locator = locator.filter({ hasText: EXECUTED_PAYLOAD_PATTERN })
        description += ', with an update id and completion offset'
    }

    await expect(locator, description).toHaveCount(1)
}
