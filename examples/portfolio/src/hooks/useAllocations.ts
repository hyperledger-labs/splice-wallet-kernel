// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type PrettyContract } from '@canton-network/core-ledger-client'
import { type AllocationView } from '@canton-network/core-token-standard'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { usePrimaryAccount } from './useAccounts'
import { usePortfolio } from '../contexts/PortfolioContext'

export const useAllocations = (): UseQueryResult<
    PrettyContract<AllocationView>[] | undefined
> => {
    const primaryParty = usePrimaryAccount()?.partyId
    const { listAllocations } = usePortfolio()
    return useQuery({
        queryKey: ['listAllocations', primaryParty],
        queryFn: async () =>
            primaryParty
                ? listAllocations({ party: primaryParty! })
                : undefined,
    })
}
