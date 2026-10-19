// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import { WalletEvent } from '@canton-network/core-types'
import { popup } from '@canton-network/core-wallet-ui-components'
import type {
    LedgerApiParams,
    PrepareExecuteParams,
    SignMessageParams,
} from '@canton-network/core-wallet-dapp-rpc-client'
import { DappClient } from './client'
import { makeMockProvider } from './__tests__/test-utils'
import * as util from './util'

vi.mock('./util', () => ({
    clearAllLocalState: vi.fn(),
}))

vi.mock('@canton-network/core-wallet-ui-components', () => ({
    popup: {
        open: vi.fn(),
        close: vi.fn(),
    },
}))

const prepareExecuteParams: PrepareExecuteParams = { commands: [] }
const signMessageParams: SignMessageParams = { message: 'hello' }
const ledgerApiParams: LedgerApiParams = {
    requestMethod: 'get',
    resource: '/v2/state/active-contracts',
}

describe('DappClient', () => {
    it('exposes the underlying provider', () => {
        const mock = makeMockProvider()
        const client = new DappClient(mock)

        expect(client.getProvider()).toBe(mock)
    })

    it('delegates RPC calls to the provider', async () => {
        const mock = makeMockProvider()
        mock.request.mockImplementation(async ({ method }) => {
            switch (method) {
                case 'connect':
                    return { isConnected: true }
                case 'status':
                    return { connection: { isConnected: true } }
                case 'listAccounts':
                    return { accounts: [] }
                case 'prepareExecute':
                    return null
                case 'prepareExecuteAndWait':
                    return { tx: { commandId: 'cmd-1' } }
                case 'signMessage':
                    return { signature: 'sig' }
                case 'ledgerApi':
                    return { result: 'ok' }
                case 'isConnected':
                    return { isConnected: true }
                default:
                    throw new Error(`unexpected method ${method}`)
            }
        })

        const client = new DappClient(mock)

        await expect(client.connect()).resolves.toEqual({ isConnected: true })
        await expect(client.status()).resolves.toEqual({
            connection: { isConnected: true },
        })
        await expect(client.listAccounts()).resolves.toEqual({ accounts: [] })
        await expect(
            client.prepareExecute(prepareExecuteParams)
        ).resolves.toBeNull()
        await expect(
            client.prepareExecuteAndWait(prepareExecuteParams)
        ).resolves.toEqual({ tx: { commandId: 'cmd-1' } })
        await expect(client.signMessage(signMessageParams)).resolves.toEqual({
            signature: 'sig',
        })
        await expect(client.ledgerApi(ledgerApiParams)).resolves.toEqual({
            result: 'ok',
        })
        await expect(client.isConnected()).resolves.toEqual({
            isConnected: true,
        })
    })

    it('registers and removes event listeners on the provider', () => {
        const mock = makeMockProvider()
        const client = new DappClient(mock)
        const listener = vi.fn()

        client.onStatusChanged(listener)
        client.onAccountsChanged(listener)
        client.onConnected(listener)
        client.onTxChanged(listener)
        client.onMessageSignature(listener)

        expect(mock.on).toHaveBeenCalledWith('statusChanged', listener)
        expect(mock.on).toHaveBeenCalledWith('accountsChanged', listener)
        expect(mock.on).toHaveBeenCalledWith('connected', listener)
        expect(mock.on).toHaveBeenCalledWith('txChanged', listener)
        expect(mock.on).toHaveBeenCalledWith('messageSignature', listener)

        client.removeOnStatusChanged(listener)
        client.removeOnAccountsChanged(listener)
        client.removeOnConnected(listener)
        client.removeOnTxChanged(listener)
        client.removeOnMessageSignature(listener)

        expect(mock.removeListener).toHaveBeenCalledWith(
            'statusChanged',
            listener
        )
        expect(mock.removeListener).toHaveBeenCalledWith(
            'accountsChanged',
            listener
        )
        expect(mock.removeListener).toHaveBeenCalledWith('connected', listener)
        expect(mock.removeListener).toHaveBeenCalledWith('txChanged', listener)
        expect(mock.removeListener).toHaveBeenCalledWith(
            'messageSignature',
            listener
        )
    })

    it('opens the wallet popup for remote providers', async () => {
        const mock = makeMockProvider()
        mock.request.mockResolvedValue({
            provider: { userUrl: 'https://wallet.example.com/user' },
        })

        const client = new DappClient(mock)
        await client.open()

        expect(popup.open).toHaveBeenCalledWith(
            'https://wallet.example.com/user'
        )
    })

    it('posts an extension open message for browser providers', async () => {
        const mock = makeMockProvider()
        mock.request.mockResolvedValue({
            provider: { userUrl: 'https://wallet.example.com/user' },
        })
        const postMessageSpy = vi.spyOn(window, 'postMessage')

        const client = new DappClient(mock, {
            providerType: 'browser',
            target: 'extension-target',
        })
        await client.open()

        expect(postMessageSpy).toHaveBeenCalledWith(
            {
                type: WalletEvent.SPLICE_WALLET_EXT_OPEN,
                url: 'https://wallet.example.com/user',
                target: 'extension-target',
            },
            '*'
        )
    })

    it('throws when status does not include a user URL', async () => {
        const mock = makeMockProvider()
        mock.request.mockResolvedValue({ provider: {} })

        const client = new DappClient(mock)
        await expect(client.open()).rejects.toThrow(
            'User URL not found in status'
        )
    })

    it('disconnects and clears local state even when the RPC fails', async () => {
        const mock = makeMockProvider()
        mock.request.mockRejectedValue(new Error('disconnect failed'))

        const client = new DappClient(mock)
        await expect(client.disconnect()).rejects.toThrow('disconnect failed')

        expect(util.clearAllLocalState).toHaveBeenCalledWith({
            closePopup: true,
        })
    })
})
