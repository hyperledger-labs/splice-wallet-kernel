// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { WalletId } from './types'

export interface DiscoveryConnectedEvent {
    walletId: WalletId
}

export interface DiscoveryDisconnectedEvent {
    walletId: WalletId
}

export interface DiscoveryErrorEvent {
    code: string
    message: string
    cause?: unknown | undefined
}

export type DiscoveryClientEventMap = {
    'discovery:connected': DiscoveryConnectedEvent
    'discovery:disconnected': DiscoveryDisconnectedEvent
    'discovery:error': DiscoveryErrorEvent
}

export type DiscoveryClientEventName = keyof DiscoveryClientEventMap

export type DiscoveryClientEventHandler<K extends DiscoveryClientEventName> = (
    event: DiscoveryClientEventMap[K]
) => void

export class EventEmitter {
    private listeners = new Map<string, Set<(...args: unknown[]) => void>>()

    on<K extends DiscoveryClientEventName>(
        event: K,
        handler: DiscoveryClientEventHandler<K>
    ): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set())
        }
        const set = this.listeners.get(event)!
        set.add(handler as (...args: unknown[]) => void)
        return () => set.delete(handler as (...args: unknown[]) => void)
    }

    off<K extends DiscoveryClientEventName>(
        event: K,
        handler: DiscoveryClientEventHandler<K>
    ): void {
        this.listeners
            .get(event)
            ?.delete(handler as (...args: unknown[]) => void)
    }

    emit<K extends DiscoveryClientEventName>(
        event: K,
        payload: DiscoveryClientEventMap[K]
    ): void {
        this.listeners
            .get(event)
            ?.forEach((handler) => handler(payload as never))
    }

    removeAllListeners(): void {
        this.listeners.clear()
    }
}
