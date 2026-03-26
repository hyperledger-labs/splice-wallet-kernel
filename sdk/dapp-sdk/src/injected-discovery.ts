// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Provider } from '@canton-network/core-splice-provider'
import type { RpcTypes as DappRpcTypes } from '@canton-network/core-wallet-dapp-rpc-client'

export type DiscoveredInjectedProvider = {
    id: string
    provider: Provider<DappRpcTypes>
    sourceRoot: string
}

const DEFAULT_ROOTS = [
    'canton',
    'splice',
    'cantonWallet',
    'consoleWallet',
] as const

/**
 * Checks if an object is a CIP-103 provider-like object.
 * @param obj - The object to check.
 * @returns True if the object is a provider-like object, false otherwise.
 */
const isProviderLike = (obj: unknown): obj is Provider<DappRpcTypes> => {
    if (typeof obj !== 'object' || obj === null) return false
    const p = obj as Record<string, unknown>
    return (
        typeof p.request === 'function' &&
        typeof p.on === 'function' &&
        typeof p.emit === 'function' &&
        typeof p.removeListener === 'function'
    )
}

export function discoverInjectedProviders(
    roots: readonly string[] = DEFAULT_ROOTS
): DiscoveredInjectedProvider[] {
    if (typeof window === 'undefined') return []

    const discovered: DiscoveredInjectedProvider[] = []
    const seen = new Set<unknown>()
    const win = window as unknown as Record<string, unknown>

    for (const root of roots) {
        const candidate = win[root]
        if (candidate === undefined || candidate === null) continue

        if (isProviderLike(candidate) && !seen.has(candidate)) {
            seen.add(candidate)
            discovered.push({
                id: root,
                provider: candidate,
                sourceRoot: root,
            })
            continue
        }

        if (typeof candidate === 'object' && candidate !== null) {
            for (const [key, value] of Object.entries(
                candidate as Record<string, unknown>
            )) {
                if (isProviderLike(value) && !seen.has(value)) {
                    seen.add(value)
                    discovered.push({
                        id: `${root}.${key}`,
                        provider: value,
                        sourceRoot: root,
                    })
                }
            }
        }
    }

    return discovered
}
