// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PartyId } from '@canton-network/core-types'
import { type AllocationView } from '@canton-network/core-token-standard'
import { useRegistryUrls } from '../contexts/RegistryServiceContext.js'
import { usePortfolio } from '../contexts/PortfolioContext.js'
import { useAllocations } from '../hooks/useAllocations.js'
import { TransferLegCard } from './TransferLegCard.js'

export type AllocationCardProps = {
    party: PartyId
    contractId: string
    allocation: AllocationView
}

export const AllocationCard: React.FC<AllocationCardProps> = ({
    party,
    contractId,
    allocation,
}) => {
    const { settlement, transferLeg, transferLegId } = allocation.allocation
    const registryUrls = useRegistryUrls()
    const { withdrawAllocation } = usePortfolio()
    const { refetch: refetchAllocations } = useAllocations()

    return (
        <div>
            <h3>Settlement</h3>
            <strong>executor:</strong> {settlement.executor}
            <br />
            <strong>allocateBefore:</strong> {settlement.allocateBefore}
            {new Date(settlement.allocateBefore) <= new Date() && '(EXPIRED!)'}
            <br />
            <TransferLegCard
                transferLegId={transferLegId}
                transferLeg={transferLeg}
            />
            {transferLeg.sender === party && (
                <button
                    onClick={async () => {
                        await withdrawAllocation({
                            registryUrls,
                            party,
                            instrumentId: transferLeg.instrumentId,
                            contractId,
                        })
                        refetchAllocations()
                    }}
                >
                    Withdraw
                </button>
            )}
        </div>
    )
}
