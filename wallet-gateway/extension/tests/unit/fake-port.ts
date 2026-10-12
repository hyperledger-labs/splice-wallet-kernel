// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Browser } from 'wxt/browser'
import { vi } from 'vitest'
import { NOTIFICATIONS_PORT_NAME } from '@/utils/notifications.js'

type Listener<T extends unknown[]> = (...args: T) => void

function fakeEvent<T extends unknown[]>() {
    const listeners = new Set<Listener<T>>()
    return {
        addListener: (listener: Listener<T>) => listeners.add(listener),
        removeListener: (listener: Listener<T>) => listeners.delete(listener),
        hasListener: (listener: Listener<T>) => listeners.has(listener),
        dispatch: (...args: T) => [...listeners].forEach((l) => l(...args)),
    }
}

/**
 * A minimal in-memory `runtime.Port`. Like the real one, `disconnect()` does
 * not fire `onDisconnect` on the same end; use `remoteDisconnect()` to
 * simulate the other end going away.
 */
export function fakePort(name = NOTIFICATIONS_PORT_NAME) {
    const onMessage = fakeEvent<[unknown]>()
    const onDisconnect = fakeEvent<[unknown]>()
    const fake = {
        name,
        onMessage,
        onDisconnect,
        postMessage: vi.fn<(message: unknown) => void>(),
        disconnect: vi.fn<() => void>(),
        /** Deliver a message from the other end. */
        receive: (message: unknown) => onMessage.dispatch(message),
        /** Simulate the other end disconnecting. */
        remoteDisconnect: () => onDisconnect.dispatch(fake),
    }
    return fake
}

export type FakePort = ReturnType<typeof fakePort>

export const asPort = (port: FakePort): Browser.runtime.Port =>
    port as unknown as Browser.runtime.Port
