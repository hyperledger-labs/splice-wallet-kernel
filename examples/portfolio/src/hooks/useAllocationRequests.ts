// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type PrettyContract } from '@canton-network/core-ledger-client'
import { type AllocationRequestView } from '@canton-network/core-token-standard'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useConnection } from '../contexts/ConnectionContext'
import { usePortfolio } from '../contexts/PortfolioContext'

export const useAllocationRequests = (): UseQueryResult<
    PrettyContract<AllocationRequestView>[] | undefined
> => {
    const {
        status: { primaryParty },
    } = useConnection()
    const { listAllocationRequests } = usePortfolio()
    return useQuery({
        queryKey: ['listAllocationRequests', primaryParty],
        queryFn: async () =>
            primaryParty
                ? listAllocationRequests({ party: primaryParty })
                : undefined,
    })
}
