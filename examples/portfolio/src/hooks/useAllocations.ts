// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type PrettyContract } from '@canton-network/core-tx-parser'
import { type AllocationView } from '@canton-network/core-token-standard'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { usePrimaryAccount } from './useAccounts'
import { useAllocationsQueryOptions } from './query-options'

export const useAllocations = (): UseQueryResult<
    PrettyContract<AllocationView>[] | undefined
> => {
    const primaryParty = usePrimaryAccount()?.partyId
    return useQuery(useAllocationsQueryOptions(primaryParty))
}
