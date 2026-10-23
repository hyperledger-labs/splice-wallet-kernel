// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    type INotificationService,
    LOGOUT_EVENT,
} from '@canton-network/core-wallet-services'
import { browser } from 'wxt/browser'
import type { Provider, StatusEvent } from './controllers/dapp/rpc-gen/typings'

/** Provider details reported by `status` and in `statusChanged` events. */
export const extensionProvider: Provider = {
    id: 'browser:ext:canton-wallet',
    providerType: 'browser',
    // dapp-sdk `open()` needs a user URL. The content script forwards the
    // open request to the background, which opens the popup (see open-ui.ts).
    userUrl: browser.runtime.getURL('/popup.html'),
}

/**
 * `status` without a session, also emitted as `statusChanged` when the
 * session is terminated.
 */
export const disconnectedStatusEvent = (reason: string): StatusEvent => ({
    provider: extensionProvider,
    connection: {
        isConnected: false,
        reason,
        isNetworkConnected: false,
        networkReason: reason,
    },
})

/**
 * Reports a terminated session to its dApp and tears down its notification
 * subscriptions (closes its port).
 */
export function notifySessionTerminated(
    notificationService: INotificationService,
    sessionId: string,
    reason: string
): void {
    const notifier = notificationService.getNotifier(sessionId)
    notifier.emit('statusChanged', disconnectedStatusEvent(reason))
    notifier.emit(LOGOUT_EVENT)
}
