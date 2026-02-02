// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useQuery } from '@tanstack/react-query'
import { listHoldings } from '../services/portfolio-service-implementation'
import { useInstruments } from '../contexts/RegistryServiceContext'
import {
    aggregateHoldings,
    enrichWithInstrumentInfo,
} from '../utils/aggregate-holdings'
import { queryKeys } from './query-keys'

export const useAggregatedHoldings = (partyId: string | undefined) => {
    const instruments = useInstruments()

    const holdingsQuery = useQuery({
        queryKey: queryKeys.listHoldings.forParty(partyId),
        queryFn: () => listHoldings({ party: partyId as string }),
        enabled: !!partyId,
        select: (holdings) =>
            enrichWithInstrumentInfo(aggregateHoldings(holdings), instruments),
    })

    return {
        instruments: holdingsQuery.data ?? [],
        isLoading: holdingsQuery.isLoading,
        isError: holdingsQuery.isError,
        error: holdingsQuery.error,
        refetch: holdingsQuery.refetch,
    }
}
