// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
// TODO: make events type-of dApp methods (perhaps just )
// Support event-driven notifications. We represent a notifier with a generic interface to support node and browser implementations.
type EventListener = (...args: unknown[]) => void
export interface Notifier {
    on(event: string, listener: EventListener): void

    emit(event: string, ...args: unknown[]): boolean

    removeListener(event: string, listenerToRemove: EventListener): void
}

export interface NotificationService {
    getNotifier(notifierId: string): Notifier
}
