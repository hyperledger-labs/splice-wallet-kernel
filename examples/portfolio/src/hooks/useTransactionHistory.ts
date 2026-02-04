// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react'
import {
    skipToken,
    useInfiniteQuery,
    type UseInfiniteQueryResult,
    type InfiniteData,
} from '@tanstack/react-query'
import { type Transaction } from '@canton-network/core-ledger-client'
import { usePortfolio } from '../contexts/PortfolioContext'
import { usePrimaryAccount } from '../hooks/useAccounts'
import type { TransactionHistoryResponse } from '../services/transaction-history-service'
import { queryKeys } from './query-keys'

export const useTransactionHistoryForParty = (
    partyId: string | undefined
): UseInfiniteQueryResult<InfiniteData<TransactionHistoryResponse>, Error> => {
    const { getTransactionHistory } = usePortfolio()
    return useInfiniteQuery({
        initialPageParam: null,
        queryKey: queryKeys.getTransactionHistory.forParty(partyId),
        queryFn: ({ pageParam }) =>
            partyId
                ? getTransactionHistory({
                      party: partyId,
                      request: pageParam,
                  })
                : skipToken,
        getNextPageParam: (
            lastPage: TransactionHistoryResponse | typeof skipToken
        ) => {
            if (lastPage === skipToken) return undefined
            if (lastPage.beginIsLedgerStart) return undefined
            return { endInclusive: lastPage.beginExclusive }
        },
        staleTime: Infinity,
    })
}

export const useTransactionHistory = (): UseInfiniteQueryResult<
    InfiniteData<TransactionHistoryResponse>,
    Error
> => {
    const primaryParty = usePrimaryAccount()?.partyId
    return useTransactionHistoryForParty(primaryParty)
}

/** Deduplicate transactions.  We don't have stable pagination, this concerns
 *  in particular the the first page, for which the cursor doesn't have any
 *  offset or limit info. */
export const useDeduplicatedTransactionHistoryForParty = (
    partyId: string | undefined
): Transaction[] => {
    const { data } = useTransactionHistoryForParty(partyId)

    return useMemo(() => {
        const ids = new Set<number>()
        const transactions = []
        for (const page of data?.pages ?? []) {
            for (const transaction of page?.transactions ?? []) {
                if (!ids.has(transaction.offset)) {
                    ids.add(transaction.offset)
                    if (transaction.events.length > 0) {
                        transactions.push(transaction)
                    }
                }
            }
        }
        return transactions
    }, [data])
}

export const useDeduplicatedTransactionHistory = (): Transaction[] => {
    const primaryParty = usePrimaryAccount()?.partyId
    return useDeduplicatedTransactionHistoryForParty(primaryParty)
}
