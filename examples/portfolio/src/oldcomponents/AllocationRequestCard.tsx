// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PartyId } from '@canton-network/core-types'
import { type PrettyContract } from '@canton-network/core-tx-parser'
import {
    type AllocationRequestView,
    type AllocationView,
} from '@canton-network/core-token-standard'
import { useCreateAllocation } from '../hooks/useCreateAllocation'
import { useWithdrawAllocation } from '../hooks/useWithdrawAllocation'
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
    const { mutate: createAllocation } = useCreateAllocation()
    const { mutate: withdrawAllocation } = useWithdrawAllocation()

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
                                onClick={() =>
                                    createAllocation({
                                        party,
                                        allocationSpecification: {
                                            settlement,
                                            transferLegId,
                                            transferLeg,
                                        },
                                    })
                                }
                            >
                                Create Allocation
                            </button>
                        )}
                        {allocationsByTransferLegId
                            ?.get(transferLegId)
                            ?.map((allocation) => (
                                <div key={allocation.contractId}>
                                    <span>Allocation Made</span>
                                    {transferLeg.sender === party && (
                                        <button
                                            onClick={() =>
                                                withdrawAllocation({
                                                    party,
                                                    instrumentId:
                                                        transferLeg.instrumentId,
                                                    contractId:
                                                        allocation.contractId,
                                                })
                                            }
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
