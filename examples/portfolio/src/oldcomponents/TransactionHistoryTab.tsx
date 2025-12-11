// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from 'react'
import { useConnection } from '../contexts/ConnectionContext.js'
import { type Transfer, getTransactionHistory } from '../utils/transfers'
import { TransferCard } from './TransferCard.js'

export const TransactionHistoryTab: React.FC = () => {
    const {
        status: { primaryParty },
    } = useConnection()

    const [loadingMore, setLoadingMore] = useState(false)
    const [transactionHistory, setTransactionHistory] = useState<
        Transfer[] | undefined
    >(undefined)

    const refreshTransactionHistory = async () => {
        if (primaryParty) {
            setLoadingMore(true)
            const th = await getTransactionHistory({ party: primaryParty })
            setTransactionHistory(th)
            setLoadingMore(false)
        } else {
            setTransactionHistory(undefined)
        }
    }

    useEffect(() => {
        refreshTransactionHistory()
    }, [primaryParty])

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
                    disabled={loadingMore}
                    onClick={() => {
                        refreshTransactionHistory()
                    }}
                >
                    load more
                </button>
            )}
        </div>
    )
}
