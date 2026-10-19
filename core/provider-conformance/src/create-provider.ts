// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Provider } from './test-provider.js'

export function createProvider(request: Provider['request']): Provider {
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>()
    const provider: Provider = {
        request,
        on(event, listener) {
            const handlers = listeners.get(event) ?? new Set()
            handlers.add(listener as (...args: unknown[]) => void)
            listeners.set(event, handlers)
            return provider
        },
        removeListener(event, listener) {
            const handlers = listeners.get(event)
            handlers?.delete(listener as (...args: unknown[]) => void)
            if (handlers?.size === 0) listeners.delete(event)
            return provider
        },
        emit(event, ...args) {
            const handlers = listeners.get(event)
            if (!handlers?.size) return false
            // Snapshot, so a listener can unsubscribe while we iterate.
            // oxlint-disable-next-line unicorn/no-useless-spread
            for (const listener of [...handlers]) listener(...args)
            return true
        },
    }
    return provider
}
