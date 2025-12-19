// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from 'react'
import { type Transaction } from '@canton-network/core-ledger-client'
import { useConnection } from '../contexts/ConnectionContext.js'
import { usePortfolio } from '../contexts/PortfolioContext.js'
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
        Transaction[] | undefined
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
            {primaryParty &&
                transactionHistory?.map((transaction) => (
                    <div key={transaction.updateId}>
                        {/* <TransferCard party={primaryParty} transfer={p} /> */}
                        {transaction.events.map((event, idx) => (
                            <div key={idx}>
                                {event.transferInstruction ? (
                                    <TransferCard
                                        party={primaryParty}
                                        transferInstructionView={
                                            event.transferInstruction
                                        }
                                    />
                                ) : (
                                    <div>TODO: Holdings change view</div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
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
