// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
// TODO: make events type-of dApp methods (perhaps just )
// Support event-driven notifications. We represent a notifier with a generic interface to support node and browser implementations.

import EventEmitter from 'events'
import { Logger } from 'pino'

type EventListener = (...args: unknown[]) => void
export interface Notifier {
    on(event: string, listener: EventListener): void

    emit(event: string, ...args: unknown[]): boolean

    removeListener(event: string, listenerToRemove: EventListener): void
}

interface INotificationService {
    getNotifier(notifierId: string): Notifier
}

export class NotificationService implements INotificationService {
    private notifiers: Map<string, Notifier> = new Map()

    constructor(private logger: Logger) {}

    getNotifier(notifierId: string): Notifier {
        const logger = this.logger
        let notifier = this.notifiers.get(notifierId)

        if (!notifier) {
            notifier = new EventEmitter()
            // Wrap all events to log with pino
            const originalEmit = notifier.emit
            notifier.emit = function (event: string, ...args: unknown[]) {
                logger.debug(
                    { event, args },
                    `Notifier emitted event: ${event} for ${notifierId}`
                )
                return originalEmit.apply(this, [event, ...args])
            }
            this.notifiers.set(notifierId, notifier)
        }

        return notifier
    }
}
