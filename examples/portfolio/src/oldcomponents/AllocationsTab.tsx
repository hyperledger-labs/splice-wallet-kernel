// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useMemo, useCallback, useEffect } from 'react'
import { type PrettyContract } from '@canton-network/core-tx-parser'
import {
    type SettlementInfo,
    type AllocationView,
} from '@canton-network/core-token-standard'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useAllocationRequests } from '../hooks/useAllocationRequests'
import { useAllocations } from '../hooks/useAllocations'
import { usePrimaryAccount } from '../hooks/useAccounts'
import { AllocationCard } from './AllocationCard'
import { AllocationRequestCard } from './AllocationRequestCard'

export const AllocationsTab: React.FC = () => {
    const portfolio = usePortfolio()
    const primaryParty = usePrimaryAccount()?.partyId

    const { data: allocationRequests } = useAllocationRequests()
    const { data: allocations } = useAllocations()

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

    // Group allocations by request and transfer leg.
    const [groupedAllocations, ungroupedAllocations] = useMemo(() => {
        const groupedAllocations = new Map<
            string,
            PrettyContract<AllocationView>[]
        >()
        const ungroupedAllocations: PrettyContract<AllocationView>[] = []

        for (const allocationRequest of allocationRequests ?? []) {
            const { settlement, transferLegs } =
                allocationRequest.interfaceViewValue
            for (const transferLegId in transferLegs) {
                const k = allocationKey(settlement, transferLegId)
                groupedAllocations.set(k, [])
            }
        }

        for (const allocation of allocations ?? []) {
            const { settlement, transferLegId } =
                allocation.interfaceViewValue.allocation
            const k = allocationKey(settlement, transferLegId)
            if (groupedAllocations.has(k)) {
                groupedAllocations.get(k)!.push(allocation)
            } else {
                console.log(groupedAllocations)
                ungroupedAllocations.push(allocation)
            }
        }

        return [groupedAllocations, ungroupedAllocations]
    }, [allocationRequests, allocations, allocationKey])

    // TODO: replace by react-query hook
    useEffect(() => {
        if (primaryParty) {
            ;(async () => {
                const allocationInstructions =
                    await portfolio.listAllocationInstructions({
                        party: primaryParty,
                    })
                console.log('allocationInstructions', allocationInstructions)
            })()
        }
    }, [portfolio, primaryParty])

    return (
        <div>
            <h2>Allocation requests</h2>

            {primaryParty &&
                allocationRequests?.map((p) => (
                    <div key={p.contractId}>
                        <AllocationRequestCard
                            party={primaryParty!}
                            allocationRequest={p.interfaceViewValue}
                            allocationsByTransferLegId={
                                new Map(
                                    Object.keys(
                                        p.interfaceViewValue.transferLegs
                                    ).map((tlid) => [
                                        tlid,
                                        groupedAllocations.get(
                                            allocationKey(
                                                p.interfaceViewValue.settlement,
                                                tlid
                                            )
                                        ) ?? [],
                                    ])
                                )
                            }
                        />
                    </div>
                ))}

            <h2>Unknown Allocations</h2>

            {primaryParty &&
                ungroupedAllocations?.map((p) => (
                    <div key={p.contractId}>
                        <AllocationCard
                            party={primaryParty!}
                            contractId={p.contractId}
                            allocation={p.interfaceViewValue}
                        />
                    </div>
                ))}
        </div>
    )
}
