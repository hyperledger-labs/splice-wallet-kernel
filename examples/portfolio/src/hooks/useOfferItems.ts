// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { PrettyContract } from '@canton-network/core-tx-parser'
import { TokenStandardService } from '@canton-network/core-token-standard-service'
import type {
    AllocationView,
    SettlementInfo,
    TransferLeg,
} from '@canton-network/core-token-standard'
import type {
    ActionItem,
    AllocationActionItem,
    TransferActionItem,
} from '@components/types'
import { getExpiryTime } from '@utils/date-format'
import { usePrimaryAccount } from './useAccounts'
import {
    useAllocationRequestsQueryOptions,
    useAllocationsQueryOptions,
    usePendingTransfersQueryOptions,
} from './query-options'

export interface OfferItemsResult {
    items: ActionItem[]
    isLoading: boolean
    isError: boolean
    error: Error | null
}

// Allocation requests and allocations are returned as separate contracts.
// Use the settlement reference plus transfer leg ID as a stable join key so
// each request leg can be decorated with any allocations already created.
function allocationKey(settlement: SettlementInfo, transferLegId: string) {
    return JSON.stringify([
        settlement.settlementRef.id,
        settlement.settlementRef.cid,
        transferLegId,
    ])
}

function compareOfferItemsByExpiry(left: ActionItem, right: ActionItem) {
    const leftExpiry = getExpiryTime(left.expiry)
    const rightExpiry = getExpiryTime(right.expiry)
    const now = Date.now()
    const leftExpired = leftExpiry < now
    const rightExpired = rightExpiry < now

    if (leftExpired !== rightExpired) {
        return leftExpired ? 1 : -1
    }

    return leftExpiry - rightExpiry
}

export function useOfferItems(): OfferItemsResult {
    const primaryParty = usePrimaryAccount()?.partyId

    // Offers combine two independent sources: pending transfer instructions and
    // allocation requests for the current primary wallet.
    const pendingTransfers = useQuery(
        usePendingTransfersQueryOptions(primaryParty)
    )
    const allocationRequests = useQuery(
        useAllocationRequestsQueryOptions(primaryParty)
    )
    const allocations = useQuery(useAllocationsQueryOptions(primaryParty))

    // Group existing allocations by the allocation request leg they fulfill.
    const groupedAllocations = useMemo(() => {
        const grouped = new Map<string, PrettyContract<AllocationView>[]>()

        for (const allocationRequest of allocationRequests.data ?? []) {
            const { settlement, transferLegs } =
                allocationRequest.interfaceViewValue
            for (const transferLegId in transferLegs) {
                const key = allocationKey(settlement, transferLegId)
                grouped.set(key, [])
            }
        }

        for (const allocation of allocations.data ?? []) {
            const { settlement, transferLegId } =
                allocation.interfaceViewValue.allocation
            const key = allocationKey(settlement, transferLegId)
            if (grouped.has(key)) {
                grouped.get(key)!.push(allocation)
            }
        }

        return grouped
    }, [allocationRequests.data, allocations.data])

    const items = useMemo(() => {
        if (!primaryParty) return []

        const offerItems: ActionItem[] = []

        // Normalize transfer instruction contracts into the shared ActionItem shape used by the UI.
        for (const contract of pendingTransfers.data ?? []) {
            const view = contract.interfaceViewValue
            const transfer = view.transfer
            const tag = view.status.tag
            const memo =
                transfer?.meta?.values?.[TokenStandardService.MEMO_KEY] ?? ''

            const transferItem: TransferActionItem = {
                kind: 'transfer',
                contractId: contract.contractId,
                currentPartyId: primaryParty,
                tag,
                type: tag?.startsWith('Transfer') ? 'Transfer' : tag,
                date: transfer.requestedAt,
                expiry: transfer.executeBefore,
                message: memo,
                sender: transfer.sender,
                receiver: transfer.receiver,
                instrumentId: transfer.instrumentId,
                amount: transfer.amount,
            }
            offerItems.push(transferItem)
        }

        // Normalize allocation requests. Each request can contain multiple transfer legs,
        // but the current party only needs legs where it is either the sender or receiver.
        for (const request of allocationRequests.data ?? []) {
            const { settlement, transferLegs } = request.interfaceViewValue
            const typedTransferLegs = transferLegs as Record<
                string,
                TransferLeg
            >
            const legsWithAllocations = Object.entries(typedTransferLegs).map(
                ([transferLegId, transferLeg]) => ({
                    transferLegId,
                    transferLeg,
                    allocations:
                        groupedAllocations.get(
                            allocationKey(settlement, transferLegId)
                        ) ?? [],
                })
            )

            const relevantLegs = legsWithAllocations.filter(
                (leg) =>
                    leg.transferLeg.sender === primaryParty ||
                    leg.transferLeg.receiver === primaryParty
            )

            if (relevantLegs.length === 0) continue

            const allocationItem: AllocationActionItem = {
                kind: 'allocation',
                contractId: request.contractId,
                currentPartyId: primaryParty,
                expiry: settlement.allocateBefore,
                settlement,
                transferLegs: relevantLegs,
            }
            offerItems.push(allocationItem)
        }

        // Show active items closest to expiry first, with expired items last.
        return [...offerItems].sort(compareOfferItemsByExpiry)
    }, [
        pendingTransfers.data,
        allocationRequests.data,
        groupedAllocations,
        primaryParty,
    ])

    const error =
        pendingTransfers.error ??
        allocationRequests.error ??
        allocations.error ??
        null

    return {
        items,
        isLoading:
            pendingTransfers.isLoading ||
            allocationRequests.isLoading ||
            allocations.isLoading,
        isError: error !== null,
        error,
    }
}
