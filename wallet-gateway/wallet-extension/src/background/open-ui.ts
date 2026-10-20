// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SpliceMessage, WalletEvent } from '@canton-network/core-types'
import { browser } from 'wxt/browser'
import { logger } from '@/shared/logger'

/**
 * Opens the wallet UI at a hash route. Tries the toolbar popup first, which
 * needs a focused browser window and always opens at `/`. Otherwise opens
 * `popup.html` in a small window.
 */
export async function openWalletUi(path = '/'): Promise<void> {
    if (path === '/') {
        // Firefox builds are MV2, which has `browserAction` instead of `action`.
        const action = browser.action ?? browser.browserAction
        try {
            await action.openPopup()
            return
        } catch {
            // No focused window, or a browser without openPopup()
        }
    }
    await browser.windows.create({
        url: browser.runtime.getURL(`/popup.html#${path}`),
        type: 'popup',
        width: 360,
        height: 600,
    })
}

/**
 * Opens the wallet UI when a dApp asks for it (dapp-sdk `open()`, forwarded
 * by the content script). Must be called synchronously during background
 * start-up, so a message that wakes the service worker is handled.
 */
export function registerOpenUiHandler(): void {
    browser.runtime.onMessage.addListener(
        (message: unknown, _sender, sendResponse) => {
            const parsed = SpliceMessage.safeParse(message)
            if (
                !parsed.success ||
                parsed.data.type !== WalletEvent.SPLICE_WALLET_EXT_OPEN
            ) {
                // Returns undefined, so the @webext-core/messaging listeners
                // of the proxy services still answer their own messages.
                return
            }

            openWalletUi().catch((error: unknown) => {
                logger.error('Failed to open the wallet UI: {error}', { error })
            })
            // Answer right away. Without a response, the content script's
            // sendMessage fails with "The message port closed before a
            // response was received".
            sendResponse(null)
        }
    )
}
