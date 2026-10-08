// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import type { PartyId } from '@canton-network/core-types'
import {
    type Instrument,
    type Instruments,
    type PortfolioInstrument,
    toPortfolioInstrument,
} from '../types/instruments'
import { resolveRegistryClient } from '@lib/registry-client'
import { useRegistryUrls } from './useRegistryUrls'
import { queryKeys } from '@hooks/query-keys'

const fetchAllInstruments = async (url: string): Promise<Instrument[]> => {
    const client = resolveRegistryClient(url)
    const collected: Instrument[] = []
    let page = await client.get('/registry/metadata/v1/instruments')
    collected.push(...page.instruments)

    while (page.nextPageToken) {
        page = await client.get('/registry/metadata/v1/instruments', {
            query: { pageToken: page.nextPageToken },
        })
        collected.push(...page.instruments)
    }
    return collected
}

export const useInstruments = (): Instruments => {
    const registryUrls = useRegistryUrls()
    const entries = useMemo(
        () => Array.from(registryUrls.entries()),
        [registryUrls]
    )

    const queries = useQueries({
        queries: entries.map(([party, url]) => ({
            queryKey: queryKeys.instruments.forRegistry(party, url),
            queryFn: async () =>
                (await fetchAllInstruments(url)).map((instrument) =>
                    toPortfolioInstrument({
                        instrument,
                        admin: party,
                        registryUrl: url,
                    })
                ),
            staleTime: Infinity,
        })),
    })

    return useMemo(() => {
        const map = new Map<PartyId, PortfolioInstrument[]>()
        entries.forEach(([party], index) => {
            const data = queries[index]?.data
            if (data) map.set(party, data)
        })
        return map
    }, [entries, queries])
}
