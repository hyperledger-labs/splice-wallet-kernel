// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Holding } from '@canton-network/core-tx-parser'
import { listHoldings } from '../services/portfolio-service-implementation'
import { useInstruments } from '../contexts/RegistryServiceContext'
import {
    aggregateHoldings,
    enrichWithInstrumentInfo,
    type AggregatedHolding,
} from '../utils/aggregate-holdings'
import { queryKeys } from './query-keys'

export interface WalletHoldingsResult {
    instruments: AggregatedHolding[]
    holdings: Holding[]
    isLoading: boolean
    isError: boolean
    error: Error | null
    refetch: () => void
}

export const useWalletHoldings = (
    partyId: string | undefined
): WalletHoldingsResult => {
    const registryInstruments = useInstruments()

    const holdingsQuery = useQuery({
        queryKey: queryKeys.listHoldings.forParty(partyId),
        queryFn: () => listHoldings({ party: partyId as string }),
        enabled: !!partyId,
    })

    const aggregatedInstruments = useMemo(() => {
        if (!holdingsQuery.data) return []
        return enrichWithInstrumentInfo(
            aggregateHoldings(holdingsQuery.data),
            registryInstruments
        )
    }, [holdingsQuery.data, registryInstruments])

    return {
        instruments: aggregatedInstruments,
        holdings: holdingsQuery.data ?? [],
        isLoading: holdingsQuery.isLoading,
        isError: holdingsQuery.isError,
        error: holdingsQuery.error,
        refetch: holdingsQuery.refetch,
    }
}
