// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { ProviderId } from '@canton-network/core-wallet-dapp-rpc-client'

enum LOCAL_STORAGE {
    DISCOVERY_SESSION = 'splice_discovery_client_session',
}

export const persistSession = (providerId: ProviderId): void => {
    try {
        localStorage.setItem(
            LOCAL_STORAGE.DISCOVERY_SESSION,
            JSON.stringify({ providerId })
        )
    } catch (e) {
        console.error('Failed to persist discovery session:', e)
    }
}

export const loadPersistedSession = (): { providerId: ProviderId } | null => {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE.DISCOVERY_SESSION)
        if (raw) return JSON.parse(raw)
    } catch (e) {
        console.error('Failed to parse stored discovery session:', e)
    }
    return null
}

export const clearPersistedSession = (): void => {
    localStorage.removeItem(LOCAL_STORAGE.DISCOVERY_SESSION)
}
