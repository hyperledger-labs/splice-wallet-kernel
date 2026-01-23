import { useMemo, useCallback } from 'react'
import { Box, Typography } from '@mui/material'
import { createFileRoute } from '@tanstack/react-router'
import {
    TokenStandardService,
    type PrettyContract,
} from '@canton-network/core-ledger-client'
import type {
    AllocationView,
    SettlementInfo,
} from '@canton-network/core-token-standard'
import { ActionRequired } from '../components/action-required'
import { usePrimaryAccount } from '../hooks/useAccounts'
import {
    usePendingTransfersQueryOptions,
    useAllocationRequestsQueryOptions,
    useAllocationsQueryOptions,
} from '../hooks/query-options'
import { useSuspenseQuery, useQuery } from '@tanstack/react-query'
import { WalletsPreview } from '../components/wallets-preview'
import type {
    ActionItem,
    TransferActionItem,
    AllocationActionItem,
} from '../components/types'

export const Route = createFileRoute('/')({
    component: Index,
})

function Index() {
    const primaryParty = usePrimaryAccount()?.partyId

    const pendingTransfers = useSuspenseQuery(
        usePendingTransfersQueryOptions(primaryParty)
    )

    const { data: allocationRequests } = useQuery(
        useAllocationRequestsQueryOptions(primaryParty)
    )

    const { data: allocations } = useQuery(
        useAllocationsQueryOptions(primaryParty)
    )

    // Produces a unique key to group allocations by request and transfer leg.
    const allocationKey = useCallback(
        (settlement: SettlementInfo, transferLegId: string) =>
            JSON.stringify([
                settlement.settlementRef.id,
                settlement.settlementRef.cid,
                transferLegId,
            ]),
        []
    )

    // Group allocations by settlement and transfer leg
    const groupedAllocations = useMemo(() => {
        const grouped = new Map<string, PrettyContract<AllocationView>[]>()

        // Initialize keys from allocation requests
        for (const allocationRequest of allocationRequests ?? []) {
            const { settlement, transferLegs } =
                allocationRequest.interfaceViewValue
            for (const transferLegId in transferLegs) {
                const k = allocationKey(settlement, transferLegId)
                grouped.set(k, [])
            }
        }

        // Group allocations
        for (const allocation of allocations ?? []) {
            const { settlement, transferLegId } =
                allocation.interfaceViewValue.allocation
            const k = allocationKey(settlement, transferLegId)
            if (grouped.has(k)) {
                grouped.get(k)!.push(allocation)
            }
        }

        return grouped
    }, [allocationRequests, allocations, allocationKey])

    const actionItems = useMemo(() => {
        if (!primaryParty) return []

        const items: ActionItem[] = []

        if (pendingTransfers.data) {
            for (const contract of pendingTransfers.data) {
                const view = contract.interfaceViewValue
                const transfer = view.transfer
                const status = view.status
                const tag = (
                    'tag' in status ? status.tag : status.current?.tag
                ) as string

                const memo =
                    transfer?.meta?.values?.[TokenStandardService.MEMO_KEY] ??
                    ''

                const transferItem: TransferActionItem = {
                    kind: 'transfer',
                    id: contract.contractId,
                    currentPartyId: primaryParty,
                    tag: tag,
                    type: tag?.startsWith('Transfer') ? 'Transfer' : tag,
                    date: transfer.requestedAt,
                    expiry: transfer.executeBefore,
                    message: memo,
                    sender: transfer.sender,
                    receiver: transfer.receiver,
                    instrumentId: transfer.instrumentId,
                    amount: transfer?.amount,
                }
                items.push(transferItem)
            }
        }

        // Add allocation action items (grouped by settlement)
        if (allocationRequests) {
            for (const request of allocationRequests) {
                const { settlement, transferLegs } = request.interfaceViewValue

                // Build transfer legs with their allocations
                const legsWithAllocations = Object.entries(transferLegs).map(
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

                // Only show if there are relevant legs
                if (relevantLegs.length === 0) continue

                const allocationItem: AllocationActionItem = {
                    kind: 'allocation',
                    id: request.contractId,
                    currentPartyId: primaryParty,
                    expiry: settlement.allocateBefore,
                    settlement,
                    transferLegs: relevantLegs,
                }
                items.push(allocationItem)
            }
        }

        return items
    }, [
        pendingTransfers.data,
        allocationRequests,
        groupedAllocations,
        primaryParty,
        allocationKey,
    ])

    return (
        <Box sx={{ my: 8 }}>
            <Typography variant="h3" component="h1" sx={{ mb: 6 }}>
                Dashboard
            </Typography>
            <ActionRequired items={actionItems} />
            <WalletsPreview />
        </Box>
    )
}
