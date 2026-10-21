// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ParsedTransactionInfo } from '@canton-network/core-tx-visualizer'
import { Card, CardActionArea, CardContent, Chip, Stack } from '@mui/material'
import {
    formatActivityDate,
    getActivityAmount,
    getActivityStatusColor,
    getActivityStatusLabel,
    getActivityType,
} from '../../internal/activity-utils'
import { CardDetailRow } from './CardDetailRow'

interface TransactionCardProps {
    transactionId: string
    commandId: string
    externalTxId?: string | null
    /** e.g. 'pending', 'signed', 'executed', 'failed'. Shown as a coloured badge */
    status: string
    parsed?: ParsedTransactionInfo | null
    createdAt?: string | null
    /** Disables the card, e.g. while the list is being refreshed */
    loading?: boolean
    /** Called when the card is clicked */
    onReview: (transactionId: string, commandId: string) => void
}

export const TransactionCard = ({
    transactionId,
    commandId,
    externalTxId = null,
    status,
    parsed = null,
    createdAt = null,
    loading = false,
    onReview,
}: TransactionCardProps) => {
    const activityType = getActivityType(parsed)
    const amount = getActivityAmount(parsed)
    const created = formatActivityDate(createdAt)

    return (
        <Card variant="outlined" data-testid="transaction-card">
            <CardActionArea
                disabled={loading}
                aria-label={`Open activity ${commandId}`}
                onClick={() => onReview(transactionId, commandId)}
            >
                <CardContent>
                    <Stack spacing={0.5}>
                        <CardDetailRow label="Command ID" value={commandId} />
                        {externalTxId && (
                            <CardDetailRow
                                label="External transaction ID"
                                value={externalTxId}
                            />
                        )}
                        <CardDetailRow
                            label="Status"
                            value={
                                <Chip
                                    data-testid="activity-status"
                                    label={getActivityStatusLabel(status)}
                                    color={getActivityStatusColor(status)}
                                    size="small"
                                />
                            }
                        />
                        <CardDetailRow
                            label="Action type"
                            value={activityType}
                        />
                        <CardDetailRow label="Created at" value={created} />
                        <CardDetailRow label="Amount" value={amount} />
                    </Stack>
                </CardContent>
            </CardActionArea>
        </Card>
    )
}
