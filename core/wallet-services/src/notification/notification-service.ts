// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Event-driven notifications shared by the remote (Node) and browser-extension
// Wallet Gateway implementations. This module is runtime-agnostic: it must not
// depend on Node built-ins (e.g. `events`) so it can run in a service worker.
// Delivery to clients (SSE, extension ports, ...) is handled by transport-specific
// `NotificationSink` implementations, see `subscribe.ts`.

export type NotificationListener = (...args: unknown[]) => void

export interface Notifier {
    on(event: string, listener: NotificationListener): void

    emit(event: string, ...args: unknown[]): boolean

    removeListener(event: string, listenerToRemove: NotificationListener): void
}

/**
 * Minimal logger contract, satisfied by pino loggers (remote) as well as
 * pino-compatible adaptors (extension).
 */
export interface NotificationLogger {
    debug(obj: object, msg: string): void
    error(obj: object, msg: string): void
}

export interface INotificationService {
    getNotifier(notifierId: string): Notifier
}

/**
 * A minimal, dependency-free event emitter. Mirrors the subset of Node's
 * EventEmitter semantics relied upon by the Wallet Gateway:
 * - listeners are invoked synchronously in registration order
 * - registering the same listener twice invokes it twice
 * - `removeListener` removes the most recently added matching listener
 * - listeners added/removed during an emit do not affect that emit
 * - `emit` returns whether any listener was registered for the event
 *
 * If a listener throws, `emit` logs the error and calls the remaining
 * listeners. Node's EventEmitter would stop and rethrow instead. This way one
 * client with a broken transport doesn't stop other clients from getting the
 * event, and the error doesn't reach the code that called `emit`.
 */
class LoggingNotifier implements Notifier {
    private listeners: Map<string, NotificationListener[]> = new Map()

    constructor(
        private readonly notifierId: string,
        private readonly logger: NotificationLogger
    ) {}

    on(event: string, listener: NotificationListener): void {
        const listeners = this.listeners.get(event)
        if (listeners) {
            listeners.push(listener)
        } else {
            this.listeners.set(event, [listener])
        }
    }

    emit(event: string, ...args: unknown[]): boolean {
        this.logger.debug(
            { event, args },
            `Notifier emitted event: ${event} for ${this.notifierId}`
        )

        const listeners = this.listeners.get(event)
        if (!listeners || listeners.length === 0) {
            return false
        }

        for (const listener of [...listeners]) {
            try {
                listener(...args)
            } catch (err) {
                this.logger.error(
                    { event, err },
                    `Notifier listener failed for event: ${event} for ${this.notifierId}`
                )
            }
        }
        return true
    }

    removeListener(
        event: string,
        listenerToRemove: NotificationListener
    ): void {
        const listeners = this.listeners.get(event)
        if (!listeners) return

        const index = listeners.lastIndexOf(listenerToRemove)
        if (index === -1) return

        listeners.splice(index, 1)
        if (listeners.length === 0) {
            this.listeners.delete(event)
        }
    }
}

export class NotificationService implements INotificationService {
    private notifiers: Map<string, Notifier> = new Map()

    constructor(private logger: NotificationLogger) {}

    getNotifier(notifierId: string): Notifier {
        let notifier = this.notifiers.get(notifierId)

        if (!notifier) {
            notifier = new LoggingNotifier(notifierId, this.logger)
            this.notifiers.set(notifierId, notifier)
        }

        return notifier
    }
}
