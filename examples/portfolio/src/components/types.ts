// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PrettyContract } from '@canton-network/core-tx-parser'
import type {
    AllocationView,
    SettlementInfo,
    TransferLeg,
} from '@canton-network/core-token-standard'

interface ActionItemBase {
    id: string
    currentPartyId: string
    expiry: string
}

export interface TransferActionItem extends ActionItemBase {
    kind: 'transfer'
    tag: string
    type: string
    date: string
    message: string
    sender: string
    receiver: string
    instrumentId: { admin: string; id: string }
    amount: string
}

export interface TransferLegWithAllocation {
    transferLegId: string
    transferLeg: TransferLeg
    allocations: PrettyContract<AllocationView>[]
}

// Allocation-specific action item (grouped by settlement)
export interface AllocationActionItem extends ActionItemBase {
    kind: 'allocation'
    settlement: SettlementInfo
    transferLegs: TransferLegWithAllocation[]
}

export type ActionItem = TransferActionItem | AllocationActionItem
