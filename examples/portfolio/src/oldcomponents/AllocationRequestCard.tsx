// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PartyId } from '@canton-network/core-types'
import { type AllocationRequestView } from '@canton-network/core-token-standard'
// import { AssetCard } from './AssetCard.js'

export type AllocationRequestCardProps = {
    party: PartyId
    allocationRequest: AllocationRequestView
}

export const AllocationRequestCard: React.FC<AllocationRequestCardProps> = ({
    allocationRequest,
}) => {
    const { settlement, transferLegs } = allocationRequest

    // const transferLegIds = Object.entries(transferLegs)

    return (
        <div>
            <h2>Settlement</h2>
            <strong>executor:</strong> {settlement.executor}
            <h2>Transfer Legs</h2>
            {Object.entries(transferLegs).map(
                ([transferLegId, transferLeg]) => (
                    <div key={transferLegId}>
                        <h3>Transfer leg {transferLegId}</h3>
                        <strong>sender:</strong> {transferLeg.sender}
                        <br />
                        <strong>receiver:</strong> {transferLeg.receiver}
                        <br />
                    </div>
                )
            )}
        </div>
    )
}
