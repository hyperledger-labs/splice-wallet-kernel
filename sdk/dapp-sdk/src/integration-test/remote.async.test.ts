// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    describe,
    it,
    expect,
    beforeAll,
    afterEach,
    afterAll,
    beforeEach,
    vi,
} from 'vitest'
import { DappSDK } from '../sdk'
import { RemoteAdapter } from '../adapter/remote-adapter'
import { popup } from '@canton-network/core-wallet-ui-components'
import { DAPP_URL, remoteWalletMockServer } from './mocks/remote-gateway'

describe('dApp SDK async', () => {
    beforeAll(() => {
        remoteWalletMockServer.listen({ onUnhandledRequest: 'error' })
    })

    afterEach(() => {
        remoteWalletMockServer.resetHandlers()
        vi.restoreAllMocks()
    })

    afterAll(() => {
        remoteWalletMockServer.close()
    })

    beforeEach(() => {
        localStorage.clear()
        delete (window as Window & { canton?: unknown }).canton
        vi.spyOn(popup, 'open').mockImplementation(() => undefined)
        vi.spyOn(popup, 'close').mockImplementation(() => undefined)
    })

    it('connects and sets window.canton', async () => {
        const remote = new RemoteAdapter({
            name: 'mock-name',
            rpcUrl: DAPP_URL,
            providerId: 'mock-providerId',
        })

        const sdk = new DappSDK({
            walletPicker: async (entries) => {
                const entry = entries.find(
                    (e) => e.providerId === 'mock-providerId'
                )
                if (!entry) {
                    throw new Error('remote adapter missing')
                }
                return {
                    providerId: entry.providerId,
                    name: entry.name,
                    type: entry.type,
                }
            },
        })

        expect(window.canton).toBeUndefined()

        await sdk.connect({
            defaultAdapters: [remote],
        })

        expect(window.canton).toBeDefined()
        expect(window.canton).toBe(sdk.getConnectedProvider())

        const accounts = await sdk.listAccounts()
        expect(accounts[0]?.partyId).toBe('mock-party::1220')

        await sdk.disconnect()
    })
})
