// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PartyId } from '@canton-network/core-types'
import { type PrettyContract } from '@canton-network/core-ledger-client'
import {
    type AllocationRequestView,
    type AllocationView,
} from '@canton-network/core-token-standard'
import { useRegistryUrls } from '../contexts/RegistryServiceContext'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useAllocations } from '../hooks/useAllocations'
import { TransferLegCard } from './TransferLegCard'
import { AllocationSettlementCard } from './AllocationSettlementCard'

export type AllocationRequestCardProps = {
    party: PartyId
    allocationRequest: AllocationRequestView
    allocationsByTransferLegId?: Map<string, PrettyContract<AllocationView>[]>
}

export const AllocationRequestCard: React.FC<AllocationRequestCardProps> = ({
    party,
    allocationRequest,
    allocationsByTransferLegId,
}) => {
    const { settlement, transferLegs } = allocationRequest
    const registryUrls = useRegistryUrls()
    const { createAllocationInstruction, withdrawAllocation } = usePortfolio()
    const { refetch: refetchAllocations } = useAllocations()

    return (
        <div>
            <AllocationSettlementCard settlementInfo={settlement} />
            <h3>Transfer Legs</h3>
            {Object.entries(transferLegs).map(
                ([transferLegId, transferLeg]) => (
                    <div key={transferLegId}>
                        <TransferLegCard
                            transferLegId={transferLegId}
                            transferLeg={transferLeg}
                        />
                        {transferLeg.sender === party && (
                            <button
                                onClick={async () => {
                                    await createAllocationInstruction({
                                        registryUrls,
                                        party,
                                        allocationSpecification: {
                                            settlement,
                                            transferLegId,
                                            transferLeg,
                                        },
                                    })
                                    refetchAllocations()
                                }}
                            >
                                Create Allocation
                            </button>
                        )}
                        {allocationsByTransferLegId
                            ?.get(transferLegId)
                            ?.map((allocation) => (
                                <div key={allocation.contractId}>
                                    {console.log(allocation)}
                                    <span>Allocation Made</span>
                                    {transferLeg.sender === party && (
                                        <button
                                            onClick={async () => {
                                                await withdrawAllocation({
                                                    registryUrls,
                                                    party,
                                                    instrumentId:
                                                        transferLeg.instrumentId,
                                                    contractId:
                                                        allocation.contractId,
                                                })
                                                refetchAllocations()
                                            }}
                                        >
                                            Withdraw Allocation
                                        </button>
                                    )}
                                </div>
                            ))}
                    </div>
                )
            )}
        </div>
    )
}
