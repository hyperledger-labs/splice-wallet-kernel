// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type {
    TokenStandardEvent,
    Transaction,
} from '@canton-network/core-tx-parser'
import { formatDateTimeString } from '@utils/date-format'
import { formatAmount, toDecimalOrNull } from '@utils/decimal'

export type TransactionFilter = 'all' | 'received' | 'sent'
export type TransactionDirection = 'received' | 'sent' | 'unknown'

type TransactionEvent = Transaction['events'][number]

type AllocationTransferLeg = {
    sender: string
    receiver: string
    amount: string
    instrumentId: { admin: string; id: string }
}

type AllocationLifecycle = 'reserved' | 'withdrawn' | 'cancelled' | null

export type TransactionHistoryEntry = {
    transaction: Transaction
    event: TransactionEvent
    eventIndex: number
}

export type TransactionDisplay = {
    type: string
    date: string
    asset: string
    amount: string | null
    direction: TransactionDirection
    counterparty: string | null
    updateId: string
}

export const FILTER_LABEL_BY_FILTER = {
    all: 'All',
    received: 'Received',
    sent: 'Sent',
} satisfies Record<TransactionFilter, string>

export function createTransactionHistoryEntries(
    transactions: Transaction[]
): TransactionHistoryEntry[] {
    return transactions.flatMap((transaction) =>
        transaction.events
            .map((event, eventIndex) => ({
                transaction,
                event,
                eventIndex,
            }))
            .filter(({ event }) => !isIntermediateUnlock(event, transaction))
    )
}

export function filterTransactionHistoryEntries(
    entries: TransactionHistoryEntry[],
    walletId: string,
    filter: TransactionFilter
) {
    if (filter === 'all') return entries

    return entries.filter(
        ({ event }) => getTransactionDirection(event, walletId) === filter
    )
}

export function getTransactionDisplay(
    entry: TransactionHistoryEntry,
    walletId: string
): TransactionDisplay {
    const { transaction, event } = entry
    const direction = getTransactionDirection(event, walletId)

    return {
        type: getTransactionType(event, direction),
        date: formatDateTimeString(transaction.recordTime),
        asset: getTransactionAsset(event),
        amount: getTransactionAmount(event),
        direction,
        counterparty: getCounterparty(event, walletId),
        updateId: transaction.updateId,
    }
}

export function getEmptyMessage({
    filter,
    hasMoreHistory,
    totalLoadedTransactions,
}: {
    filter: TransactionFilter
    hasMoreHistory: boolean
    totalLoadedTransactions: number
}) {
    if (filter === 'all') {
        return hasMoreHistory && totalLoadedTransactions === 0
            ? 'No transactions loaded yet.'
            : 'There are currently no transactions in this wallet'
    }

    return hasMoreHistory
        ? `No ${filter} transactions in the loaded history yet.`
        : `No ${filter} transactions.`
}

/**
 * Returns the user-facing Activity label for a parsed transaction event.
 *
 * Transfer-instruction lifecycle rows intentionally remain separate, matching
 * Splice wallet history behavior. The labels distinguish offer creation
 * (`Pending`) from terminal transfer outcomes (`Completed`, `Rejected`, etc.)
 * so multiple rows from the same logical transfer do not look like duplicates.
 */
function getTransactionType(
    event: TransactionEvent,
    direction: TransactionDirection
): string {
    const allocationLifecycle = getAllocationLifecycle(event)
    if (allocationLifecycle === 'reserved') return 'Allocation reserved'
    if (allocationLifecycle === 'withdrawn') return 'Allocation withdrawn'
    if (allocationLifecycle === 'cancelled') return 'Allocation cancelled'

    // Only honor status tags when a real transfer view exists. The synthetic
    // instruction the parser builds for direct transfers carries a placeholder
    // 'Pending' status.
    const status = event.transferInstruction?.transfer
        ? event.transferInstruction.status.current?.tag
        : undefined

    if (status === 'Pending') {
        if (direction === 'received') return 'Offer received ↘'
        if (direction === 'sent') return 'Offer sent ↗'
        return 'Transfer offer'
    }

    if (status === 'Completed') {
        if (direction === 'received') return 'Transfer received ↘'
        if (direction === 'sent') return 'Transfer sent ↗'
        return 'Transfer completed'
    }

    if (status === 'Rejected') return 'Offer rejected'
    if (status === 'Withdrawn') return 'Offer withdrawn'
    if (status === 'Failed') return 'Offer failed'

    if (event.label.type === 'TransferOut') return 'Transfer sent ↗'
    if (event.label.type === 'TransferIn') return 'Transfer received ↘'
    if (event.label.type === 'MergeSplit') {
        // Reward collection uses the merge operation but mints new value.
        const mintAmount = toDecimalOrNull(event.label.mintAmount)
        return mintAmount?.greaterThan(0) ? 'Rewards collected' : 'Merge/Split'
    }
    if (event.label.type === 'Mint') {
        const reason = event.label.reason?.toLowerCase()
        return reason?.includes('tapped') && reason.includes('faucet')
            ? 'DevNet tap'
            : 'Mint'
    }
    if (event.label.type === 'Burn') {
        return event.label.reason?.toLowerCase() === 'traffic purchase'
            ? 'Traffic purchase'
            : 'Burn'
    }
    if (event.label.type === 'ExpireDust') return 'Dust expired'

    if (event.label.type === 'Unlock') return 'Funds unlocked'
    if (event.label.type === 'Lock') return 'Funds locked'

    if (direction === 'received') return 'Received ↘'
    if (direction === 'sent') return 'Sent ↗'

    return event.label.type
}

function getTransactionAsset(event: TransactionEvent): string {
    const allocationLeg = getAllocationTransferLeg(event)
    if (allocationLeg?.instrumentId) {
        return allocationLeg.instrumentId.id || allocationLeg.instrumentId.admin
    }

    const transfer = event.transferInstruction?.transfer
    if (transfer?.instrumentId) {
        const { admin, id } = transfer.instrumentId
        return id || admin
    }

    const summary = getHoldingSummary(event)
    if (summary?.instrumentId) {
        return summary.instrumentId.id || summary.instrumentId.admin
    }

    return '—'
}

function getTransactionAmount(event: TransactionEvent): string | null {
    const allocationLeg = getAllocationTransferLeg(event)
    if (allocationLeg) return formatAmount(allocationLeg.amount)

    const transfer = event.transferInstruction?.transfer
    if (transfer) return formatAmount(transfer.amount ?? '0')

    if (event.label.type === 'TransferOut') {
        const total = sumAmounts(
            event.label.receiverAmounts.map(({ amount }) => amount)
        )
        if (total) return formatAmount(total)
    }

    if (event.label.type === 'Unlock' || event.label.type === 'Lock') {
        const locked = toDecimalOrNull(
            event.lockedHoldingsChangeSummaries[0]?.amountChange ?? '0'
        )
        return locked ? formatAmount(locked.abs()) : null
    }

    const summary = getHoldingSummary(event)
    if (!summary?.amountChange) return null

    const amountChange = toDecimalOrNull(summary.amountChange)
    if (amountChange) return formatAmount(amountChange.abs())

    return formatAmount(summary.amountChange)
}

function getTransactionDirection(
    event: TransactionEvent,
    walletId: string
): TransactionDirection {
    if (getAllocationLifecycle(event)) return 'unknown'

    const transfer = event.transferInstruction?.transfer
    if (transfer) {
        if (extractSenderFromTransferInstruction(event) === walletId)
            return 'sent'
        if (extractReceiverFromTransferInstruction(event) === walletId)
            return 'received'
        return 'unknown'
    }

    // Direct transfers have no transfer view, but the parsed label states
    // the direction.
    if (event.label.type === 'TransferIn') return 'received'
    if (event.label.type === 'TransferOut') return 'sent'

    if (event.label.type === 'Mint') return 'received'
    if (event.label.type === 'Burn') return 'sent'

    const summary = getHoldingSummary(event)
    if (!summary?.amountChange) return 'unknown'

    const amountChange = toDecimalOrNull(summary.amountChange)
    if (!amountChange || amountChange.isZero()) return 'unknown'

    return amountChange.isNegative() ? 'sent' : 'received'
}

function getCounterparty(
    event: TransactionEvent,
    walletId: string
): string | null {
    const allocationLifecycle = getAllocationLifecycle(event)
    const allocationLeg = getAllocationTransferLeg(event)
    if (allocationLifecycle === 'reserved' && allocationLeg) {
        if (allocationLeg.sender === walletId) return allocationLeg.receiver
        if (allocationLeg.receiver === walletId) return allocationLeg.sender
    }
    if (
        allocationLifecycle === 'withdrawn' ||
        allocationLifecycle === 'cancelled'
    ) {
        return 'Self'
    }

    const transfer = event.transferInstruction?.transfer
    if (transfer) {
        const sender = extractSenderFromTransferInstruction(event)
        const receiver = extractReceiverFromTransferInstruction(event)

        if (sender === walletId) return receiver || null
        if (receiver === walletId) return sender || null
        return null
    }

    // Direct transfers have no transfer view; the parsed label carries the
    // counterparty instead.
    if (event.label.type === 'TransferIn') return event.label.sender || null
    if (event.label.type === 'TransferOut') {
        const receiver = event.label.receiverAmounts
            .map(({ receiver }) => receiver)
            .find((receiver) => receiver !== walletId)
        return receiver ?? null
    }
    if (event.label.type === 'MergeSplit') return 'Self'

    return null
}

function getAllocationLifecycle(event: TransactionEvent): AllocationLifecycle {
    const name =
        getTokenStandardChoiceName(event) === 'EventLog_HoldingsChange'
            ? (event.label as { v2?: { parentChoice: string } }).v2
                  ?.parentChoice
            : getTokenStandardChoiceName(event)
    if (name === 'AllocationFactory_Allocate') return 'reserved'
    if (name === 'Allocation_Withdraw') return 'withdrawn'
    if (name === 'Allocation_Cancel') return 'cancelled'
    return null
}

function getAllocationTransferLeg(
    event: TransactionEvent
): AllocationTransferLeg | null {
    if (getTokenStandardChoiceName(event) !== 'AllocationFactory_Allocate') {
        return null
    }

    const choice = getTokenStandardChoice(event)
    return (
        (choice?.choiceArgument?.allocation
            ?.transferLeg as AllocationTransferLeg) ?? null
    )
}

function getTokenStandardChoice(event: TransactionEvent) {
    return 'tokenStandardChoice' in event.label
        ? event.label.tokenStandardChoice
        : null
}

function getTokenStandardChoiceName(event: TransactionEvent) {
    return getTokenStandardChoice(event)?.name
}

function sumAmounts(amounts: string[]) {
    return amounts.reduce((total, amount) => {
        const parsed = toDecimalOrNull(amount)
        return total && parsed ? total.plus(parsed) : null
    }, toDecimalOrNull('0'))
}

function getHoldingSummary(event: TransactionEvent) {
    return (
        event.unlockedHoldingsChangeSummaries[0] ||
        event.lockedHoldingsChangeSummaries[0]
    )
}

function extractSenderFromTransferInstruction(event: TokenStandardEvent) {
    const transfer = event.transferInstruction?.transfer
    const sender =
        typeof transfer.sender === 'object'
            ? transfer.sender?.owner
            : transfer.sender

    return sender
}

function extractReceiverFromTransferInstruction(event: TokenStandardEvent) {
    const transfer = event.transferInstruction?.transfer
    const receiver =
        typeof transfer.receiver === 'object'
            ? transfer.receiver?.owner
            : transfer.receiver

    return receiver
}

/**
 *
 * Used for when a holding is consumed by another event in the same transaction as an internal step
 * for example accepting an offer unlcoks funds and then transfers them
 * this should not show up as a separate row in the transaction history
 */
function isIntermediateUnlock(
    event: TransactionEvent,
    transaction: Transaction
): boolean {
    if (event.label.type !== 'Unlock') return false
    const released = new Set(
        event.unlockedHoldingsChange.creates.map((h) => h.contractId)
    )

    if (released.size === 0) return false

    return transaction.events.some(
        (other) =>
            other !== event &&
            [
                ...other.unlockedHoldingsChange.archives,
                ...other.lockedHoldingsChange.archives,
            ].some((h) => released.has(h.contractId))
    )
}
