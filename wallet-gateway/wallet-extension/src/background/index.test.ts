// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { errorCodes } from '@canton-network/core-rpc-errors'
import { createProxyService } from '@webext-core/proxy-service'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { DAPP_RPC_KEY, USER_RPC_KEY } from '@/shared/service-keys'
import { authContextItem } from '@/shared/storage'
import { VaultErrorName, vaultMessenger } from '@/shared/vault-protocol'
import { startBackground } from '.'
import { createVault } from './vault'

describe('startBackground', () => {
    beforeEach(() => {
        fakeBrowser.reset()
        // The fake browser doesn't implement runtime.onConnect.
        vi.spyOn(
            fakeBrowser.runtime.onConnect,
            'addListener'
        ).mockImplementation(() => {})
    })

    afterEach(() => {
        vi.restoreAllMocks()
        // The messenger is a singleton that allows one listener per message.
        vaultMessenger.removeAllListeners()
    })

    it('adds every listener before the wallet store has loaded', () => {
        // The store never loads, so nothing may wait for it.
        vi.spyOn(authContextItem, 'getValue').mockReturnValue(
            new Promise(() => {})
        )
        const onMessage = vi.spyOn(fakeBrowser.runtime.onMessage, 'addListener')
        const onInstalled = vi.spyOn(
            fakeBrowser.runtime.onInstalled,
            'addListener'
        )

        startBackground()

        expect(fakeBrowser.runtime.onConnect.addListener).toHaveBeenCalledTimes(
            1
        )
        // The vault service, the dApp dispatcher, the user controller and the
        // open-UI handler
        expect(onMessage).toHaveBeenCalledTimes(4)
        expect(onInstalled).toHaveBeenCalledTimes(1)
    })

    it('answers dApp requests from the content script', async () => {
        startBackground()
        const dispatcher = createProxyService(DAPP_RPC_KEY)

        await expect(
            dispatcher.request(
                { jsonrpc: '2.0', id: 1, method: 'isConnected' },
                'https://dapp.example'
            )
        ).resolves.toEqual({
            jsonrpc: '2.0',
            id: 1,
            result: {
                isConnected: false,
                reason: 'Locked',
                isNetworkConnected: false,
                networkReason: 'Locked',
            },
        })
        await expect(
            dispatcher.request(
                { jsonrpc: '2.0', id: 2, method: 'constructor' },
                'https://dapp.example'
            )
        ).resolves.toMatchObject({
            id: 2,
            error: { code: errorCodes.rpc.methodNotFound },
        })
    })

    it('answers user API requests from the extension pages', async () => {
        const vault = createVault({ iterations: 1000 })
        startBackground({ vault })
        const user = createProxyService(USER_RPC_KEY)

        await expect(user.listNetworks()).rejects.toMatchObject({
            name: VaultErrorName.Locked,
        })
        await vault.create('abcde1')
        await expect(user.listNetworks()).resolves.toEqual({
            networks: [
                expect.objectContaining({
                    id: 'canton:local-oauth',
                    name: 'Local (OAuth IDP)',
                }),
            ],
        })
    })
})
