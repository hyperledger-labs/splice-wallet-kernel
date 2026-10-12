// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    type JsonRpcRequest,
    type SpliceMessage,
    WalletEvent,
} from '@canton-network/core-types'
import type { Browser } from 'wxt/browser'
import {
    NOTIFICATIONS_PORT_NAME,
    type NotificationPortMessage,
} from '@/utils/notifications.js'

type Port = Browser.runtime.Port

export interface NotificationRelayOptions {
    /** Opens a notifications port to the background script. */
    connect: () => Port
    /** The dApp page window notifications are posted to. */
    window: Pick<Window, 'postMessage'>
    /** Routing key stamped on notifications, see `WindowTransport`. */
    target: string | undefined
}

const isJsonRpcParams = (
    params: unknown
): params is NonNullable<JsonRpcRequest['params']> =>
    typeof params === 'object' && params !== null

/**
 * Whether a dApp JSON-RPC response reports an authenticated connection, i.e.
 * the dApp is now entitled to receive notifications.
 */
export function isConnectedResponse(method: string, result: unknown): boolean {
    if (typeof result !== 'object' || result === null) return false
    switch (method) {
        case 'connect':
            return (result as { isConnected?: unknown }).isConnected === true
        case 'status':
            return (
                (result as { connection?: { isConnected?: unknown } })
                    .connection?.isConnected === true
            )
        default:
            return false
    }
}

/**
 * Relays notifications from the background script to the dApp page.
 *
 * A notifications port is opened once the dApp is connected. Each port
 * message is posted to the page as a JSON-RPC notification (a request without
 * `id`), which `WindowTransport.onNotification` delivers to the dApp. The
 * background closes the port when there is no session or on logout; it is
 * reopened on the next connected `connect` / `status` response.
 */
export class NotificationRelay {
    private port: Port | undefined

    constructor(private readonly options: NotificationRelayOptions) {}

    get isOpen(): boolean {
        return this.port !== undefined
    }

    /** Inspect a JSON-RPC response relayed to the dApp. */
    onResponse(method: string, result: unknown): void {
        if (isConnectedResponse(method, result)) {
            this.open()
        }
    }

    open(): void {
        if (this.port) return

        let port: Port
        try {
            port = this.options.connect()
        } catch (error) {
            // e.g. the extension was reloaded and this context is orphaned
            logger.warn('Unable to open the notifications port: {*}', {
                error,
            })
            return
        }

        this.port = port
        port.onMessage.addListener((message: NotificationPortMessage) =>
            this.relay(message)
        )
        port.onDisconnect.addListener(() => {
            if (this.port === port) {
                this.port = undefined
            }
        })
    }

    close(): void {
        const port = this.port
        this.port = undefined
        port?.disconnect()
    }

    private relay({ method, params }: NotificationPortMessage): void {
        if (params !== undefined && !isJsonRpcParams(params)) {
            logger.warn('Dropping notification with invalid params: {*}', {
                method,
            })
            return
        }

        const message: SpliceMessage = {
            type: WalletEvent.SPLICE_WALLET_REQUEST,
            request: {
                jsonrpc: '2.0',
                method,
                ...(params !== undefined && { params }),
            },
            target: this.options.target,
        }
        this.options.window.postMessage(message, '*')
    }
}

export function createNotificationRelay(): NotificationRelay {
    return new NotificationRelay({
        connect: () =>
            browser.runtime.connect({ name: NOTIFICATIONS_PORT_NAME }),
        window,
        target: browser.runtime?.id,
    })
}
