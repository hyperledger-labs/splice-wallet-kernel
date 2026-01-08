// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    useInfiniteQuery,
    type UseInfiniteQueryResult,
    type InfiniteData,
} from '@tanstack/react-query'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useConnection } from '../contexts/ConnectionContext'
import type { TransactionHistoryResponse } from '../services/transaction-history-service'

export const useTransactionHistory = (): UseInfiniteQueryResult<
    InfiniteData<TransactionHistoryResponse | undefined>,
    Error
> => {
    const {
        status: { primaryParty },
    } = useConnection()
    const { getTransactionHistory } = usePortfolio()
    return useInfiniteQuery({
        initialPageParam: null,
        queryKey: ['getTransactionHistory', primaryParty],
        queryFn: ({ pageParam }) =>
            primaryParty
                ? getTransactionHistory({
                      party: primaryParty,
                      request: pageParam,
                  })
                : undefined,
        getNextPageParam: (
            lastPage: TransactionHistoryResponse | undefined
        ) => {
            if (lastPage === undefined) return undefined
            if (lastPage.beginIsLedgerStart) return undefined
            return { endInclusive: lastPage.beginExclusive }
        },
        staleTime: Infinity,
    })
}
