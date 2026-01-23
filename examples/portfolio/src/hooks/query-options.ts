// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { queryOptions } from '@tanstack/react-query'
import { usePortfolio } from '../contexts/PortfolioContext'
import { queryKeys } from './query-keys'

export const usePendingTransfersQueryOptions = (party: string | undefined) => {
    const { listPendingTransfers } = usePortfolio()
    return queryOptions({
        retry: 10,
        queryKey: queryKeys.listPendingTransfers.forParty(party),
        queryFn: async () =>
            party ? listPendingTransfers({ party: party! }) : [],
    })
}

export const useAllocationRequestsQueryOptions = (
    party: string | undefined
) => {
    const { listAllocationRequests } = usePortfolio()
    return queryOptions({
        queryKey: queryKeys.listAllocationRequests.forParty(party),
        queryFn: () => listAllocationRequests({ party: party! }),
        enabled: !!party,
    })
}

export const useAllocationsQueryOptions = (party: string | undefined) => {
    const { listAllocations } = usePortfolio()
    return queryOptions({
        queryKey: queryKeys.listAllocations.forParty(party),
        queryFn: () => listAllocations({ party: party! }),
        enabled: !!party,
    })
}
