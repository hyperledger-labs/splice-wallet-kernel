// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PartyId } from '@canton-network/core-types'
import { type AllocationRequestView } from '@canton-network/core-token-standard'
import { useRegistryUrls } from '../contexts/RegistryServiceContext.js'
import { usePortfolio } from '../contexts/PortfolioContext.js'
import { AssetCard } from './AssetCard.js'

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

    // const transferLegIds = Object.entries(transferLegs)

    return (
        <div>
            <h2>Settlement</h2>
            <strong>executor:</strong> {settlement.executor}
            <br />
            <strong>allocateBefore:</strong> {settlement.allocateBefore}
            {new Date(settlement.allocateBefore) <= new Date() && '(EXPIRED!)'}
            <br />
            <h2>Transfer Legs</h2>
            {Object.entries(transferLegs).map(
                ([transferLegId, transferLeg]) => (
                    <div key={transferLegId}>
                        <h3>Transfer leg {transferLegId}</h3>
                        <strong>sender:</strong> {transferLeg.sender}
                        <br />
                        <strong>receiver:</strong> {transferLeg.receiver}
                        <br />
                        <AssetCard
                            amount={transferLeg.amount}
                            /* TODO: use actual symbol! */
                            symbol={transferLeg.instrumentId.id}
                        />
                        {transferLeg.sender === party && (
                            <button
                                onClick={() => {
                                    createAllocationInstruction({
                                        registryUrls,
                                        party,
                                        allocationSpecification: {
                                            settlement,
                                            transferLegId,
                                            transferLeg,
                                        },
                                    })
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
