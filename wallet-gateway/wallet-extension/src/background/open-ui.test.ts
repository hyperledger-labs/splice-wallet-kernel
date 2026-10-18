// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WalletEvent } from '@canton-network/core-types'
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    type MockInstance,
    vi,
} from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { openWalletUi, registerOpenUiHandler } from './open-ui'

describe('openWalletUi', () => {
    beforeEach(() => {
        fakeBrowser.reset()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('opens the toolbar popup', async () => {
        const openPopup = vi
            .spyOn(fakeBrowser.action, 'openPopup')
            .mockResolvedValue(undefined)
        const create = vi.spyOn(fakeBrowser.windows, 'create')

        await openWalletUi()

        expect(openPopup).toHaveBeenCalledTimes(1)
        expect(create).not.toHaveBeenCalled()
    })

    it('opens a popup window when the toolbar popup cannot open', async () => {
        vi.spyOn(fakeBrowser.action, 'openPopup').mockRejectedValue(
            new Error('Could not find an active browser window.')
        )
        const create = vi.spyOn(fakeBrowser.windows, 'create')

        await openWalletUi()

        expect(create).toHaveBeenCalledWith({
            url: 'chrome-extension://test-extension-id/popup.html#/',
            type: 'popup',
            width: 360,
            height: 600,
        })
    })

    it('opens other routes in a popup window', async () => {
        const openPopup = vi.spyOn(fakeBrowser.action, 'openPopup')
        const create = vi.spyOn(fakeBrowser.windows, 'create')

        await openWalletUi('/connect/request-1')

        expect(openPopup).not.toHaveBeenCalled()
        expect(create).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'chrome-extension://test-extension-id/popup.html#/connect/request-1',
            })
        )
    })
})

describe('registerOpenUiHandler', () => {
    let addListener: MockInstance<
        typeof fakeBrowser.runtime.onMessage.addListener
    >

    beforeEach(() => {
        fakeBrowser.reset()
        addListener = vi.spyOn(fakeBrowser.runtime.onMessage, 'addListener')
        registerOpenUiHandler()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('opens the wallet UI on SPLICE_WALLET_EXT_OPEN', async () => {
        const openPopup = vi
            .spyOn(fakeBrowser.action, 'openPopup')
            .mockResolvedValue(undefined)

        await fakeBrowser.runtime.sendMessage({
            type: WalletEvent.SPLICE_WALLET_EXT_OPEN,
            url: 'chrome-extension://test-extension-id/popup.html',
        })

        await vi.waitFor(() => expect(openPopup).toHaveBeenCalledTimes(1))
    })

    it('answers the open message, but no other message', () => {
        const [listener] = addListener.mock.calls[0]!
        const sendResponse = vi.fn()
        vi.spyOn(fakeBrowser.action, 'openPopup').mockResolvedValue(undefined)

        const ignored = listener(
            { type: 'proxy-service.dapp-rpc-service', timestamp: 1 },
            {},
            sendResponse
        )
        expect(ignored).toBeUndefined()
        expect(sendResponse).not.toHaveBeenCalled()

        listener(
            {
                type: WalletEvent.SPLICE_WALLET_EXT_OPEN,
                url: 'chrome-extension://test-extension-id/popup.html',
            },
            {},
            sendResponse
        )
        expect(sendResponse).toHaveBeenCalledWith(null)
    })

    it('ignores other messages', async () => {
        const openPopup = vi.spyOn(fakeBrowser.action, 'openPopup')

        await fakeBrowser.runtime.sendMessage({
            type: WalletEvent.SPLICE_WALLET_EXT_READY,
        })
        await fakeBrowser.runtime.sendMessage({ type: 'proxy-service.x' })

        expect(openPopup).not.toHaveBeenCalled()
    })
})
