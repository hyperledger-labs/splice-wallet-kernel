// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    type DappNotificationEvent,
    type INotificationService,
    type NotificationLogger,
    type NotificationSink,
    type NotificationSubscriber,
    subscribeNotifications,
} from '@canton-network/core-wallet-services/notification'
import type { Browser } from 'wxt/browser'
import {
    NOTIFICATIONS_PORT_NAME,
    type NotificationPortMessage,
} from '@/utils/notifications.js'

type Port = Browser.runtime.Port

/**
 * Wraps a logger for the `NotificationService`, dropping the emitted `args`
 * from log records: event payloads can carry the session's access token.
 * Only event metadata (event name, notifier id, errors) is logged.
 */
export function withoutNotificationArgs(
    logger: NotificationLogger
): NotificationLogger {
    const metadata = (obj: object): object => {
        const rest: Record<string, unknown> = { ...obj }
        delete rest.args
        return rest
    }
    return {
        debug: (obj, msg) => logger.debug(metadata(obj), msg),
        error: (obj, msg) => logger.error(metadata(obj), msg),
    }
}

/**
 * Delivers notifications to a content script over a `runtime.Port`.
 *
 * Encoding differs from the remote's SSE transport: SSE sends the full emit
 * argument list (`data: [args]`) and `DappAsyncProvider` spreads it, whereas the
 * window transport carries a JSON-RPC notification whose single `params` value
 * `DappSyncProvider` emits as-is. Every dApp event is emitted with exactly one
 * argument, so only `args[0]` is sent.
 */
export class PortNotificationSink implements NotificationSink {
    constructor(private readonly port: Port) {}

    send(event: DappNotificationEvent, args: unknown[]): void {
        const message: NotificationPortMessage = { method: event }
        if (args[0] !== undefined) {
            message.params = args[0]
        }
        this.port.postMessage(message)
    }

    close(): void {
        this.port.disconnect()
    }
}

/**
 * Resolves the session & user a newly connected client should be subscribed
 * to, or `undefined` when there is no authenticated session.
 */
export type ResolveSubscriber = () => Promise<
    NotificationSubscriber | undefined
>

/**
 * Subscribes a content-script port to the notifications of the current
 * session. The port is disconnected when there is no authenticated session
 * (the equivalent of the remote's 401), and unsubscribed when it disconnects.
 */
export async function handleNotificationPort(
    port: Port,
    notificationService: INotificationService,
    resolveSubscriber: ResolveSubscriber
): Promise<void> {
    // Register before any await, so a disconnect during the lookup is seen.
    let disconnected = false
    port.onDisconnect.addListener(() => {
        disconnected = true
    })

    let subscriber: NotificationSubscriber | undefined
    try {
        subscriber = await resolveSubscriber()
    } catch (error) {
        logger.error('Failed to resolve notification subscriber: {*}', {
            error,
        })
    }

    if (disconnected) return
    if (!subscriber) {
        port.disconnect()
        return
    }

    const unsubscribe = subscribeNotifications(
        notificationService,
        subscriber,
        new PortNotificationSink(port)
    )
    port.onDisconnect.addListener(unsubscribe)
}

/**
 * Accepts notification ports opened by content scripts. Must be called
 * synchronously during background start-up, so a connect that wakes the MV3
 * service worker is not missed.
 */
export function registerNotificationPorts(
    notificationService: INotificationService,
    resolveSubscriber: ResolveSubscriber
): void {
    browser.runtime.onConnect.addListener((port) => {
        if (port.name !== NOTIFICATIONS_PORT_NAME) return
        void handleNotificationPort(
            port,
            notificationService,
            resolveSubscriber
        )
    })
}
