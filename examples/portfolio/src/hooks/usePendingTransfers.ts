// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type PrettyContract } from '@canton-network/core-ledger-client'
import { type TransferInstructionView } from '@canton-network/core-ledger-client'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useConnection } from '../contexts/ConnectionContext'
import { usePortfolio } from '../contexts/PortfolioContext'

export const usePendingTransfers = (): UseQueryResult<
    PrettyContract<TransferInstructionView>[] | undefined
> => {
    const {
        status: { primaryParty },
    } = useConnection()
    const { listPendingTransfers } = usePortfolio()
    return useQuery({
        queryKey: ['listPendingTransfers', primaryParty],
        queryFn: async () =>
            primaryParty ? listPendingTransfers({ party: primaryParty! }) : [],
    })
}
