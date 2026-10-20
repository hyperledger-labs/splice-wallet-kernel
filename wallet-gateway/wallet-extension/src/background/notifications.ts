// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    type DappNotificationEvent,
    type INotificationService,
    type NotificationLogger,
    type NotificationSink,
    type NotificationSubscriber,
    subscribeNotifications,
} from '@canton-network/core-wallet-services'
import type { Store } from '@canton-network/core-wallet-store'
import type { Logger } from '@logtape/logtape'
import { browser, type Browser } from 'wxt/browser'
import { logger } from '@/shared/logger'
import {
    NOTIFICATIONS_PORT_NAME,
    type NotificationPortMessage,
} from '@/shared/ports'
import { authContext } from './auth-context'

type Port = Browser.runtime.Port

/**
 * Adapts a LogTape logger to the `NotificationService`'s `(obj, msg)` logger.
 */
export function toNotificationLogger(target: Logger): NotificationLogger {
    return {
        debug: (obj, msg) => target.debug(msg, { ...obj }),
        error: (obj, msg) => target.error(msg, { ...obj }),
    }
}

/**
 * Wraps a logger for the `NotificationService`, dropping the emitted `args`
 * from log records: event payloads can carry the session's access token.
 * Only event metadata (event name, notifier id, errors) is logged.
 */
export function withoutNotificationArgs(
    target: NotificationLogger
): NotificationLogger {
    const metadata = (obj: object): object => {
        const rest: Record<string, unknown> = { ...obj }
        delete rest.args
        return rest
    }
    return {
        debug: (obj, msg) => target.debug(metadata(obj), msg),
        error: (obj, msg) => target.error(metadata(obj), msg),
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
 * Resolves the signed-in user's current session, which content-script ports
 * are subscribed to.
 */
export function currentSessionSubscriber(
    getStore: () => Promise<Store>
): ResolveSubscriber {
    return async () => {
        const context = await authContext.load()
        if (!context) return undefined

        const store = await getStore()
        const session = await store.getSession(context.accessToken)
        if (!session) return undefined

        return { sessionId: session.id, userId: context.userId }
    }
}

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
