// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PartyId } from '@canton-network/core-types'
import { type AllocationRequestView } from '@canton-network/core-token-standard'
import { useRegistryUrls } from '../contexts/RegistryServiceContext.js'
import { usePortfolio } from '../contexts/PortfolioContext.js'
import { useAllocations } from '../hooks/useAllocations.js'
import { TransferLegCard } from './TransferLegCard.js'
import { AllocationSettlementCard } from './AllocationSettlementCard.js'

export type AllocationRequestCardProps = {
    party: PartyId
    allocationRequest: AllocationRequestView
}

export const AllocationRequestCard: React.FC<AllocationRequestCardProps> = ({
    party,
    allocationRequest,
}) => {
    const { settlement, transferLegs } = allocationRequest
    const registryUrls = useRegistryUrls()
    const { createAllocationInstruction } = usePortfolio()
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
                                Accept
                            </button>
                        )}
                    </div>
                )
            )}
        </div>
    )
}
