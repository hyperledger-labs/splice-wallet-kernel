// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    type DappNotificationEvent,
    LOGOUT_EVENT,
    SESSION_SCOPED_EVENTS,
    USER_SCOPED_EVENTS,
} from './events.js'
import type {
    INotificationService,
    NotificationListener,
    Notifier,
} from './notification-service.js'

/**
 * Transport-specific delivery of notifications to a single connected client,
 * e.g. an SSE response (remote) or a runtime port (browser extension).
 */
export interface NotificationSink {
    /**
     * Deliver an event to the client. `args` are the raw arguments the event
     * was emitted with; encoding them onto the wire is up to the transport.
     */
    send(event: DappNotificationEvent, args: unknown[]): void

    /** Close the underlying transport, e.g. after the session was terminated. */
    close(): void
}

export interface NotificationSubscriber {
    sessionId: string
    userId: string
}

/**
 * Subscribe a client to the notifications relevant to its session & user, and
 * forward them to the given sink. On `logout` the subscription is torn down and
 * the sink is closed.
 *
 * @returns an idempotent unsubscribe function; call it when the client disconnects.
 */
export function subscribeNotifications(
    notificationService: INotificationService,
    { sessionId, userId }: NotificationSubscriber,
    sink: NotificationSink
): () => void {
    const sessionNotifier = notificationService.getNotifier(sessionId)
    const userNotifier = notificationService.getNotifier(userId)

    const registrations: [Notifier, string, NotificationListener][] = []
    const register = (
        notifier: Notifier,
        event: string,
        listener: NotificationListener
    ) => {
        notifier.on(event, listener)
        registrations.push([notifier, event, listener])
    }

    let subscribed = true
    const unsubscribe = () => {
        if (!subscribed) return
        subscribed = false
        for (const [notifier, event, listener] of registrations) {
            notifier.removeListener(event, listener)
        }
    }

    const forward =
        (event: DappNotificationEvent) =>
        (...args: unknown[]) =>
            sink.send(event, args)

    for (const event of USER_SCOPED_EVENTS) {
        register(userNotifier, event, forward(event))
    }
    for (const event of SESSION_SCOPED_EVENTS) {
        register(sessionNotifier, event, forward(event))
    }
    register(sessionNotifier, LOGOUT_EVENT, () => {
        unsubscribe()
        sink.close()
    })

    return unsubscribe
}
