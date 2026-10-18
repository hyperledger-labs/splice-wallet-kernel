// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { errorCodes } from '@canton-network/core-rpc-errors'
import { createProxyService } from '@webext-core/proxy-service'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { DAPP_RPC_KEY, USER_RPC_KEY } from '@/shared/service-keys'
import { authContextItem } from '@/shared/storage'
import { startBackground } from '.'

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
    })

    it('adds every listener before the wallet store has loaded', () => {
        // The store never loads, so nothing may wait for it.
        vi.spyOn(authContextItem, 'getValue').mockReturnValue(
            new Promise(() => {})
        )
        const onMessage = vi.spyOn(fakeBrowser.runtime.onMessage, 'addListener')

        startBackground()

        expect(fakeBrowser.runtime.onConnect.addListener).toHaveBeenCalledTimes(
            1
        )
        // The dApp dispatcher, the user controller and the open-UI handler
        expect(onMessage).toHaveBeenCalledTimes(3)
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
                isNetworkConnected: false,
                networkReason: 'Unauthenticated',
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
        startBackground()
        const user = createProxyService(USER_RPC_KEY)

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
