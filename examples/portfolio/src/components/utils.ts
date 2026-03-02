// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type {
    ActionItem,
    TransferActionItem,
    AllocationActionItem,
    TransferLegWithAllocation,
} from './types'

export const isTransferItem = (
    item: ActionItem
): item is TransferActionItem => {
    return item.kind === 'transfer'
}

export const isAllocationItem = (
    item: ActionItem
): item is AllocationActionItem => {
    return item.kind === 'allocation'
}

export const isReceiver = (item: TransferActionItem) => {
    return item.currentPartyId === item.receiver
}

export const getCounterparty = (item: TransferActionItem) => {
    if (isReceiver(item)) {
        return { label: 'Sender', value: item.sender }
    }
    return { label: 'Receiver', value: item.receiver }
}

export const isSenderOfLeg = (
    currentPartyId: string,
    leg: TransferLegWithAllocation
) => {
    return currentPartyId === leg.transferLeg.sender
}

export const isReceiverOfLeg = (
    currentPartyId: string,
    leg: TransferLegWithAllocation
) => {
    return currentPartyId === leg.transferLeg.receiver
}

export const getLegsForCurrentParty = (item: AllocationActionItem) => {
    return item.transferLegs.filter(
        (leg) =>
            isSenderOfLeg(item.currentPartyId, leg) ||
            isReceiverOfLeg(item.currentPartyId, leg)
    )
}

export const getLegsPendingAllocation = (item: AllocationActionItem) => {
    return item.transferLegs.filter(
        (leg) =>
            isSenderOfLeg(item.currentPartyId, leg) &&
            leg.allocations.length === 0
    )
}

export const getLegsWithAllocation = (item: AllocationActionItem) => {
    return item.transferLegs.filter(
        (leg) =>
            isSenderOfLeg(item.currentPartyId, leg) &&
            leg.allocations.length > 0
    )
}
