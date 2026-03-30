// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    CANTON_ANNOUNCE_PROVIDER_EVENT,
    CANTON_REQUEST_PROVIDER_EVENT,
} from '@canton-network/core-types'

export type AnnouncedProvider = {
    /** Stable identifier for the wallet/extension (e.g. chrome.runtime.id). */
    id: string
    /** Display name for pickers. */
    name: string
    /** Optional icon (data URL or https URL) */
    icon?: string | undefined
    /**
     * Optional routing key for postMessage-based transports.
     * For extensions, this should typically equal `id`.
     */
    target?: string | undefined
}

export async function requestAnnouncedProviders(options?: {
    timeoutMs?: number | undefined
}): Promise<AnnouncedProvider[]> {
    if (typeof window === 'undefined') return []

    const timeoutMs = options?.timeoutMs ?? 300
    const discovered = new Map<string, AnnouncedProvider>()

    const handler = (event: Event) => {
        const ce = event as CustomEvent<unknown>
        const detail = ce.detail as Partial<AnnouncedProvider> | undefined
        if (!detail?.id || !detail.name) return
        if (discovered.has(detail.id)) return
        discovered.set(detail.id, {
            id: detail.id,
            name: detail.name,
            icon: detail.icon,
            target: detail.target,
        })
    }

    window.addEventListener(CANTON_ANNOUNCE_PROVIDER_EVENT, handler)
    try {
        window.dispatchEvent(
            new CustomEvent(CANTON_REQUEST_PROVIDER_EVENT, { detail: {} })
        )
        await new Promise((resolve) => setTimeout(resolve, timeoutMs))
    } finally {
        window.removeEventListener(CANTON_ANNOUNCE_PROVIDER_EVENT, handler)
    }

    return Array.from(discovered.values())
}
