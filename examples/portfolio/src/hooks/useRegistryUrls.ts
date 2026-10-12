// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useMemo } from 'react'
import {
    useMutation,
    useQueries,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import type { PartyId } from '@canton-network/core-types'
import { usePortfolioConfig } from '@contexts/PortfolioConfigContext'
import { fetchRegistryInfo } from '@lib/registry-client'
import { normalizeRegistryUrl } from '@utils/registry'
import type {
    RegistryEntry,
    RegistryReachabilityStatus,
} from '../types/registries'
import { queryKeys } from '@hooks/query-keys'

const STORAGE_KEY = 'registries'
const EMPTY: ReadonlyMap<PartyId, string> = new Map()

type RegistryCandidate = {
    configuredPartyId?: PartyId
    registryUrl: string
    isRemovable: boolean
}

const readFromStorage = (): ReadonlyMap<PartyId, string> => {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw
        ? new Map(Object.entries(JSON.parse(raw) as Record<string, string>))
        : new Map()
}

const writeToStorage = (next: ReadonlyMap<PartyId, string>): void => {
    window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(Object.fromEntries(next))
    )
}

// Combines Amulet, configured token, and stored registries into normalized,
// URL-keyed candidates. Stored entries replace matching configured URLs.
const collectRegistryCandidates = (
    amuletRegistryUrl: string,
    configuredRegistries: ReadonlyArray<{
        partyId?: PartyId
        url: string
    }>,
    storedRegistries: ReadonlyMap<PartyId, string>
): RegistryCandidate[] => {
    const byUrl = new Map<string, RegistryCandidate>()

    // Start with application configuration, deduplicating equivalent URLs.
    for (const registry of [
        { url: amuletRegistryUrl },
        ...configuredRegistries,
    ]) {
        const registryUrl = normalizeRegistryUrl(registry.url)
        const current = byUrl.get(registryUrl)
        byUrl.set(registryUrl, {
            configuredPartyId: registry.partyId ?? current?.configuredPartyId,
            registryUrl,
            isRemovable: current?.isRemovable ?? false,
        })
    }

    // Overlay registries added through settings so they remain removable.
    for (const [partyId, url] of storedRegistries) {
        const registryUrl = normalizeRegistryUrl(url)
        byUrl.set(registryUrl, {
            configuredPartyId: partyId,
            registryUrl,
            isRemovable: true,
        })
    }

    return Array.from(byUrl.values()).sort((left, right) =>
        left.registryUrl.localeCompare(right.registryUrl)
    )
}

type RegistryInfoQuery = {
    data?: { adminId: PartyId }
    isPending: boolean
    isError: boolean
}

const toRegistryEntry = (
    candidate: RegistryCandidate,
    query?: RegistryInfoQuery
): RegistryEntry => {
    const partyId = candidate.configuredPartyId ?? query?.data?.adminId
    const status: RegistryReachabilityStatus =
        !query || query.isPending
            ? 'checking'
            : query.isError
              ? 'unreachable'
              : 'reachable'

    return {
        partyId,
        registryUrl: candidate.registryUrl,
        status,
        isRemovable: candidate.isRemovable,
    }
}

const deduplicateRegistryEntriesByParty = (
    entries: RegistryEntry[]
): RegistryEntry[] => {
    const resolvedByParty = new Map(
        entries.flatMap((entry) =>
            entry.partyId ? [[entry.partyId, entry] as const] : []
        )
    )
    const unresolved = entries.filter((entry) => !entry.partyId)

    return [...unresolved, ...resolvedByParty.values()].sort((left, right) =>
        left.registryUrl.localeCompare(right.registryUrl)
    )
}

export const useRegistryEntries = (): RegistryEntry[] => {
    const { amulet, token } = usePortfolioConfig()

    // Keep local-storage registries in React Query so mutations update all consumers.
    const { data: storedRegistries = EMPTY } = useQuery({
        queryKey: queryKeys.registries.all,
        queryFn: readFromStorage,
        initialData: readFromStorage,
        staleTime: Infinity,
        gcTime: Infinity,
    })

    const candidates = useMemo(
        () =>
            collectRegistryCandidates(
                amulet.registry,
                token.registries,
                storedRegistries
            ),
        [amulet.registry, token.registries, storedRegistries]
    )

    // One metadata query per URL provides both its admin party and reachability.
    const queries = useQueries({
        queries: candidates.map(({ registryUrl }) => ({
            queryKey: queryKeys.registryInfo.forRegistry(registryUrl),
            queryFn: () => fetchRegistryInfo(registryUrl),
            retry: false,
            refetchInterval: 30_000,
            refetchOnWindowFocus: true,
        })),
    })

    return useMemo(() => {
        const storedParties = new Set(storedRegistries.keys())
        const entries = candidates.map((candidate, index) =>
            toRegistryEntry(candidate, queries[index])
        )

        // A registry added through settings overrides configured entries for the same party
        const visibleEntries = entries.filter(
            (entry) =>
                entry.isRemovable ||
                !entry.partyId ||
                !storedParties.has(entry.partyId)
        )

        return deduplicateRegistryEntriesByParty(visibleEntries)
    }, [candidates, queries, storedRegistries])
}

export const useReachableRegistryUrls = () => {
    const entries = useRegistryEntries()

    const reachableRegistryUrls = useMemo<ReadonlyMap<PartyId, string>>(
        () =>
            new Map(
                entries.flatMap((entry) =>
                    entry.status === 'reachable' && entry.partyId
                        ? [[entry.partyId, entry.registryUrl]]
                        : []
                )
            ),
        [entries]
    )

    const unreachableEntries = useMemo(
        () => entries.filter((entry) => entry.status === 'unreachable'),
        [entries]
    )

    return {
        entries,
        reachableRegistryUrls,
        unreachableEntries,
        isChecking: entries.some((entry) => entry.status === 'checking'),
    }
}

export const useRegistryUrls = (): ReadonlyMap<PartyId, string> => {
    const entries = useRegistryEntries()

    return useMemo(
        () =>
            new Map(
                entries.flatMap((entry) =>
                    entry.partyId ? [[entry.partyId, entry.registryUrl]] : []
                )
            ),
        [entries]
    )
}

export const useRegistryMutations = () => {
    const queryClient = useQueryClient()

    const setRegistryUrl = useMutation({
        mutationFn: async ({
            party,
            url,
        }: {
            party?: PartyId
            url: string
        }) => {
            const registryUrl = normalizeRegistryUrl(url)
            let info
            try {
                info = await fetchRegistryInfo(registryUrl)
            } catch {
                throw new Error(
                    'Unable to read registry info. Check that the URL points to a reachable token registry.'
                )
            }

            const resolvedParty = party ?? info.adminId

            const current =
                queryClient.getQueryData<ReadonlyMap<PartyId, string>>(
                    queryKeys.registries.all
                ) ?? readFromStorage()
            const next = new Map(current)
            next.set(resolvedParty, registryUrl)
            writeToStorage(next)
            queryClient.setQueryData(queryKeys.registries.all, next)
            queryClient.setQueryData(
                queryKeys.registryInfo.forRegistry(registryUrl),
                info
            )
        },
    })

    const deleteRegistryUrl = useCallback(
        (party: PartyId) => {
            const current =
                queryClient.getQueryData<ReadonlyMap<PartyId, string>>(
                    queryKeys.registries.all
                ) ?? readFromStorage()
            const next = new Map(current)
            next.delete(party)
            writeToStorage(next)
            queryClient.setQueryData(queryKeys.registries.all, next)
        },
        [queryClient]
    )

    return { setRegistryUrl, deleteRegistryUrl }
}
