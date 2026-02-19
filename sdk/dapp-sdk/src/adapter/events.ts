// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { WalletId } from './types'

export interface SessionConnectedEvent {
    walletId: WalletId
}

export interface SessionDisconnectedEvent {
    walletId: WalletId
    reason?: string | undefined
}

export interface SessionExpiredEvent {
    walletId: WalletId
}

export interface ClientErrorEvent {
    code: string
    message: string
    cause?: unknown | undefined
}

export type DappClientEventMap = {
    'session:connected': SessionConnectedEvent
    'session:disconnected': SessionDisconnectedEvent
    'session:expired': SessionExpiredEvent
    error: ClientErrorEvent
}

export type DappClientEventName = keyof DappClientEventMap

export type DappClientEventHandler<K extends DappClientEventName> = (
    event: DappClientEventMap[K]
) => void

export class EventEmitter {
    private listeners = new Map<string, Set<(...args: unknown[]) => void>>()

    on<K extends DappClientEventName>(
        event: K,
        handler: DappClientEventHandler<K>
    ): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set())
        }
        const set = this.listeners.get(event)!
        set.add(handler as (...args: unknown[]) => void)
        return () => set.delete(handler as (...args: unknown[]) => void)
    }

    off<K extends DappClientEventName>(
        event: K,
        handler: DappClientEventHandler<K>
    ): void {
        this.listeners
            .get(event)
            ?.delete(handler as (...args: unknown[]) => void)
    }

    emit<K extends DappClientEventName>(
        event: K,
        payload: DappClientEventMap[K]
    ): void {
        this.listeners
            .get(event)
            ?.forEach((handler) => handler(payload as never))
    }

    removeAllListeners(): void {
        this.listeners.clear()
    }
}
