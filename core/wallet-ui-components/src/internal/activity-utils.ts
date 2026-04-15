// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ParsedTransactionInfo } from '@canton-network/core-tx-visualizer'

export function getActivityStatusTone(
    status: string
): 'success' | 'warning' | 'danger' | 'default' {
    const normalized = status.toLowerCase()

    if (normalized === 'executed' || normalized === 'signed') {
        return 'success'
    }
    if (normalized === 'pending') {
        return 'warning'
    }
    if (normalized === 'failed' || normalized === 'rejected') {
        return 'danger'
    }

    return 'default'
}

export function getActivityStatusLabel(status: string): string {
    return status ? status : 'Unknown'
}

export function getActivityStatusBadgeClass(status: string): string {
    switch (getActivityStatusTone(status)) {
        case 'success':
            return 'wg-activity-status-success'
        case 'warning':
            return 'text-bg-warning'
        case 'danger':
            return 'text-bg-danger'
        default:
            return 'text-bg-secondary'
    }
}

export function formatActivityDate(value: string | null | undefined): string {
    if (!value) {
        return 'N/A'
    }

    const normalized = value.replace('T', ' ')
    return normalized.length >= 16 ? normalized.slice(0, 16) : normalized
}

export function getActivityType(parsed: ParsedTransactionInfo | null): string {
    const choiceId = parsed?.choiceId
    return choiceId ? choiceId : 'N/A'
}

export function getActivityAmount(
    parsed: ParsedTransactionInfo | null
): string {
    const amount = parsed?.amount
    if (!amount) {
        return 'N/A'
    }

    return amount
}
