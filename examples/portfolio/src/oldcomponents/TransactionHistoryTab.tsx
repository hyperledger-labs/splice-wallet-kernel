// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useConnection } from '../contexts/ConnectionContext'
import {
    useTransactionHistory,
    useDeduplicatedTransactionHistory,
} from '../hooks/useTransactionHistory'
import { TransferCard } from './TransferCard'
import { HoldingsChangeSummaryCard } from './HoldingsChangeSummaryCard'

export const TransactionHistoryTab: React.FC = () => {
    const {
        status: { primaryParty },
    } = useConnection()

    const { status, fetchNextPage, isFetchingNextPage, hasNextPage } =
        useTransactionHistory()

    const transactions = useDeduplicatedTransactionHistory()

    return (
        <div>
            <h2>Transaction History</h2>
            {primaryParty &&
                transactions.map((transaction) => (
                    <div key={transaction.updateId}>
                        <code>
                            At {transaction.offset} ({transaction.recordTime})
                        </code>
                        <br />
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
                                    <div>
                                        <strong>{event.label.type}</strong>
                                        {event.lockedHoldingsChangeSummaries
                                            .length > 0 && (
                                            <div>
                                                <strong>Locked:</strong>
                                                {event.lockedHoldingsChangeSummaries.map(
                                                    (c, idx) => (
                                                        <HoldingsChangeSummaryCard
                                                            key={idx}
                                                            change={c}
                                                        />
                                                    )
                                                )}
                                            </div>
                                        )}
                                        {event.unlockedHoldingsChangeSummaries
                                            .length > 0 && (
                                            <div>
                                                <strong>Locked:</strong>
                                                {event.unlockedHoldingsChangeSummaries.map(
                                                    (c, idx) => (
                                                        <HoldingsChangeSummaryCard
                                                            key={idx}
                                                            change={c}
                                                        />
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            {!hasNextPage && <span>(end)</span>}
            {status === 'pending' && <span>⏳</span>}
            {!isFetchingNextPage && hasNextPage && primaryParty && (
                <button
                    disabled={
                        isFetchingNextPage || !hasNextPage || !primaryParty
                    }
                    onClick={() => fetchNextPage()}
                >
                    load more
                </button>
            )}
        </div>
    )
}
