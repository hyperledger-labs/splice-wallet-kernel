// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from 'react'
import { useConnection } from '../contexts/ConnectionContext.js'
import { usePortfolio } from '../contexts/PortfolioContext.js'
import { type Transfer } from '../models/transfer.js'
import { TransferCard } from './TransferCard.js'

export const TransactionHistoryTab: React.FC = () => {
    const {
        status: { primaryParty },
    } = useConnection()
    const {
        getTransactionHistory,
        fetchMoreRecentTransactionHistory,
        fetchOlderTransactionHistory,
    } = usePortfolio()

    const [loadingMore, setLoadingMore] = useState(false)
    const [haveInitialHistory, setHaveInitialHistory] = useState(false) // ugly
    const [transactionHistory, setTransactionHistory] = useState<
        Transfer[] | undefined
    >(undefined)

    useEffect(() => {
        ;(async () => {
            if (primaryParty) {
                setLoadingMore(true)
                const th = haveInitialHistory
                    ? await fetchMoreRecentTransactionHistory({
                          party: primaryParty,
                      })
                    : await getTransactionHistory({ party: primaryParty })
                setTransactionHistory(th)
                setHaveInitialHistory(true)
                setLoadingMore(false)
            } else {
                setTransactionHistory(undefined)
            }
        })()
    }, [
        primaryParty,
        haveInitialHistory,
        getTransactionHistory,
        fetchMoreRecentTransactionHistory,
    ])

    return (
        <div>
            <h2>Transaction History</h2>
            {primaryParty && (
                <ul>
                    {transactionHistory?.map((p) => (
                        <li key={p.contractId}>
                            <TransferCard party={primaryParty} transfer={p} />
                        </li>
                    ))}
                </ul>
            )}
            {loadingMore ? (
                <span>⏳</span>
            ) : (
                <button
                    disabled={loadingMore || !primaryParty}
                    onClick={async () => {
                        setLoadingMore(true)
                        const th = await fetchOlderTransactionHistory({
                            party: primaryParty!,
                        })
                        setTransactionHistory(th)
                        setLoadingMore(false)
                    }}
                >
                    load more
                </button>
            )}
        </div>
    )
}
