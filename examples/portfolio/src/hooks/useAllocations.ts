// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type PrettyContract } from '@canton-network/core-ledger-client'
import { type AllocationView } from '@canton-network/core-token-standard'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useConnection } from '../contexts/ConnectionContext'
import { usePortfolio } from '../contexts/PortfolioContext'

export const useAllocations = (): UseQueryResult<
    PrettyContract<AllocationView>[] | undefined
> => {
    const {
        status: { primaryParty },
    } = useConnection()
    const { listAllocations } = usePortfolio()
    return useQuery({
        queryKey: ['listAllocations', primaryParty],
        queryFn: () => listAllocations({ party: primaryParty! }),
        enabled: !!primaryParty,
    })
}
