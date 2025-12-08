// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PartyId } from '@canton-network/core-types'
import { useState, useEffect } from 'react'
import { type Transfer, getTransactionHistory } from '../utils/transfers'
import { TransferCard } from './TransferCard.js'

export type TransactionHistoryTabProps = {
    registryUrls: Map<PartyId, string>
    party: PartyId
}

export const TransactionHistoryTab: React.FC<TransactionHistoryTabProps> = ({
    registryUrls,
    party,
}) => {
    const [transactionHistory, setTransactionHistory] = useState<
        Transfer[] | undefined
    >(undefined)

    const refreshTransactionHistory = async () => {
        const th = await getTransactionHistory({ party })
        console.log(th)
        setTransactionHistory(th)
    }

    useEffect(() => {
        refreshTransactionHistory()
    }, [party])

    return (
        <div>
            <h2>Trasaction History</h2>
            <ul>
                {transactionHistory?.map((p) => (
                    <li key={p.contractId}>
                        <TransferCard
                            registryUrls={registryUrls}
                            party={party}
                            transfer={p}
                        />
                    </li>
                ))}
            </ul>
            <button
                onClick={() => {
                    refreshTransactionHistory()
                }}
            >
                load more
            </button>
        </div>
    )
}
