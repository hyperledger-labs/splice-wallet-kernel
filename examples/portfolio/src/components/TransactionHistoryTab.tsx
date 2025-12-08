// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from 'react'
import { type Transfer, getTransactionHistory } from '../utils/transfers'

export type TransactionHistoryTabProps = {
    party: string
}

export const TransactionHistoryTab: React.FC<TransactionHistoryTabProps> = ({
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
                    <li key={p.contractId}>{JSON.stringify(p)}</li>
                ))}
            </ul>
        </div>
    )
}
