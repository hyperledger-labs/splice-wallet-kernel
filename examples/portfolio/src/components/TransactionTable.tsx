// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import Decimal from 'decimal.js'
import {
    Box,
    Button,
    Paper,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material'
import { type Transaction } from '@canton-network/core-ledger-client'
import { CopyableIdentifier } from './copyable-identifier'

interface TransactionTableProps {
    transactions: Transaction[]
    walletId: string
    hasNextPage: boolean
    isFetching: boolean
    isFetchingNextPage: boolean
    onLoadMore: () => void
}

const formatDate = (recordTime: string): string => {
    return new Date(recordTime).toLocaleString()
}

const getTransactionType = (transaction: Transaction): string => {
    const event = transaction.events[0]
    if (!event) return 'Unknown'
    return event.label.type
}

const getTransactionAsset = (transaction: Transaction): string => {
    const event = transaction.events[0]
    if (!event) return '-'

    // Try to get asset from transfer instruction
    if (event.transferInstruction?.transfer?.instrumentId) {
        const { admin, id } = event.transferInstruction.transfer.instrumentId
        return id || admin
    }

    // Try to get asset from holdings change summaries
    const summary =
        event.unlockedHoldingsChangeSummaries[0] ||
        event.lockedHoldingsChangeSummaries[0]
    if (summary?.instrumentId) {
        return summary.instrumentId.id || summary.instrumentId.admin
    }

    return '-'
}

const getTransactionAmount = (
    transaction: Transaction,
    walletId: string
): { amount: string; isOutgoing: boolean } => {
    const event = transaction.events[0]
    if (!event) return { amount: '-', isOutgoing: false }

    // Try to get amount from transfer instruction
    if (event.transferInstruction?.transfer) {
        const transfer = event.transferInstruction.transfer
        const amount = transfer.amount || '0'
        const isOutgoing = transfer.sender === walletId
        return { amount, isOutgoing }
    }

    // Try to get amount from holdings change summaries
    const summary =
        event.unlockedHoldingsChangeSummaries[0] ||
        event.lockedHoldingsChangeSummaries[0]
    if (summary) {
        const amount = summary.amountChange || '0'
        const amountChange = new Decimal(amount)
        const isOutgoing = amountChange.isNegative()
        return { amount, isOutgoing }
    }

    return { amount: '-', isOutgoing: false }
}

const getCounterparty = (
    transaction: Transaction,
    walletId: string
): string => {
    const event = transaction.events[0]
    if (!event) return '-'

    if (event.transferInstruction?.transfer) {
        const transfer = event.transferInstruction.transfer
        if (transfer.sender === walletId) {
            return transfer.receiver || '-'
        } else if (transfer.receiver === walletId) {
            return transfer.sender || '-'
        }
    }

    return '-'
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
    transactions,
    walletId,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    onLoadMore,
}) => {
    const hasTransactions = transactions.length > 0
    console.log('transactions', transactions)

    if (isFetching && !hasTransactions) {
        return (
            <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                    borderRadius: 1,
                    overflow: 'hidden',
                }}
            >
                <Table size="medium">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: 'action.hover' }}>
                            <TableCell
                                sx={{ py: 2, px: 3, fontWeight: 'medium' }}
                            >
                                Type
                            </TableCell>
                            <TableCell
                                sx={{ py: 2, px: 3, fontWeight: 'medium' }}
                            >
                                Date
                            </TableCell>
                            <TableCell
                                sx={{ py: 2, px: 3, fontWeight: 'medium' }}
                            >
                                Asset
                            </TableCell>
                            <TableCell
                                sx={{ py: 2, px: 3, fontWeight: 'medium' }}
                            >
                                Amount
                            </TableCell>
                            <TableCell
                                sx={{ py: 2, px: 3, fontWeight: 'medium' }}
                            >
                                Counterparty
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {[1, 2, 3].map((i) => (
                            <TableRow key={i}>
                                <TableCell sx={{ py: 2.5, px: 3 }}>
                                    <Skeleton variant="text" width={80} />
                                </TableCell>
                                <TableCell sx={{ py: 2.5, px: 3 }}>
                                    <Skeleton variant="text" width={120} />
                                </TableCell>
                                <TableCell sx={{ py: 2.5, px: 3 }}>
                                    <Skeleton variant="text" width={60} />
                                </TableCell>
                                <TableCell sx={{ py: 2.5, px: 3 }}>
                                    <Skeleton variant="text" width={80} />
                                </TableCell>
                                <TableCell sx={{ py: 2.5, px: 3 }}>
                                    <Skeleton variant="text" width={150} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        )
    }

    return (
        <Box>
            <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                    borderRadius: 1,
                    overflow: 'hidden',
                }}
            >
                <Table size="medium">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: 'action.hover' }}>
                            <TableCell
                                sx={{ py: 2, px: 3, fontWeight: 'medium' }}
                            >
                                Type
                            </TableCell>
                            <TableCell
                                sx={{ py: 2, px: 3, fontWeight: 'medium' }}
                            >
                                Date
                            </TableCell>
                            <TableCell
                                sx={{ py: 2, px: 3, fontWeight: 'medium' }}
                            >
                                Asset
                            </TableCell>
                            <TableCell
                                sx={{ py: 2, px: 3, fontWeight: 'medium' }}
                            >
                                Amount
                            </TableCell>
                            <TableCell
                                sx={{ py: 2, px: 3, fontWeight: 'medium' }}
                            >
                                Counterparty
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {hasTransactions ? (
                            transactions.map((transaction) => {
                                const txType = getTransactionType(transaction)
                                const asset = getTransactionAsset(transaction)
                                const { amount, isOutgoing } =
                                    getTransactionAmount(transaction, walletId)
                                const counterparty = getCounterparty(
                                    transaction,
                                    walletId
                                )
                                const amountPrefix = isOutgoing ? '-' : '+'
                                const amountColor = isOutgoing
                                    ? 'error.main'
                                    : 'success.main'

                                return (
                                    <TableRow
                                        key={transaction.updateId}
                                        sx={{
                                            '&:hover': {
                                                backgroundColor: 'action.hover',
                                            },
                                            '&:last-child td': { border: 0 },
                                        }}
                                    >
                                        <TableCell
                                            component="th"
                                            scope="row"
                                            sx={{ py: 2.5, px: 3 }}
                                        >
                                            {txType}
                                        </TableCell>
                                        <TableCell sx={{ py: 2.5, px: 3 }}>
                                            {formatDate(transaction.recordTime)}
                                        </TableCell>
                                        <TableCell sx={{ py: 2.5, px: 3 }}>
                                            <Box
                                                component="span"
                                                sx={{
                                                    px: 1.5,
                                                    py: 0.5,
                                                    backgroundColor:
                                                        'action.selected',
                                                    color: 'text.primary',
                                                    borderRadius: 1,
                                                    fontSize: '0.875rem',
                                                    display: 'inline-block',
                                                }}
                                            >
                                                {asset}
                                            </Box>
                                        </TableCell>
                                        <TableCell
                                            sx={{
                                                py: 2.5,
                                                px: 3,
                                                color: amountColor,
                                                fontWeight: 'medium',
                                            }}
                                        >
                                            {amount === '-'
                                                ? '-'
                                                : `${amountPrefix}${amount}`}
                                        </TableCell>
                                        <TableCell sx={{ py: 2.5, px: 3 }}>
                                            {counterparty === '-' ? (
                                                '-'
                                            ) : (
                                                <CopyableIdentifier
                                                    value={counterparty}
                                                />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} sx={{ py: 4, px: 3 }}>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography
                                            variant="body1"
                                            color="text.secondary"
                                        >
                                            There are currently no transactions
                                            in this wallet
                                        </Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {hasNextPage && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Button
                        variant="outlined"
                        onClick={onLoadMore}
                        disabled={isFetchingNextPage}
                        size="small"
                    >
                        {isFetchingNextPage ? 'Loading...' : 'Load more'}
                    </Button>
                </Box>
            )}
        </Box>
    )
}
