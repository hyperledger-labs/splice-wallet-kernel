// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useQuery } from '@tanstack/react-query'
import { useRegistryUrls } from '../contexts/RegistryServiceContext'
import { resolveTokenStandardClient } from '../services/resolve'

export type RegistryValidationStatus =
    | 'valid'
    | 'no-registries'
    | 'all-unreachable'
    | 'checking'

interface RegistryCheckResult {
    partyId: string
    url: string
    reachable: boolean
}

async function checkRegistryReachability(
    url: string,
    partyId: string
): Promise<RegistryCheckResult> {
    try {
        const client = await resolveTokenStandardClient({ registryUrl: url })
        await client.get('/registry/metadata/v1/info')
        return { partyId, url, reachable: true }
    } catch {
        return { partyId, url, reachable: false }
    }
}

export function useRegistryValidation(): RegistryValidationStatus {
    const registryUrls = useRegistryUrls()

    const registryEntries = Array.from(registryUrls.entries())

    const query = useQuery({
        queryKey: ['registry-validation', registryEntries],
        queryFn: async (): Promise<RegistryValidationStatus> => {
            if (registryEntries.length === 0) {
                return 'no-registries'
            }

            const results = await Promise.all(
                registryEntries.map(([partyId, url]) =>
                    checkRegistryReachability(url, partyId)
                )
            )

            const anyIsReachable = results.some((r) => r.reachable)
            if (anyIsReachable) {
                return 'valid'
            }

            return 'all-unreachable'
        },
        retry: 1, // retrying just once here incase of transient networks errors.
        refetchInterval: 30_000,
        refetchOnWindowFocus: true,
        placeholderData: (prev) => prev,
    })

    if (query.isLoading && !query.data) {
        return 'checking'
    }

    return query.data ?? 'checking'
}
