// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useMemo, useCallback, useState, useEffect } from 'react'
import { type PrettyContract } from '@canton-network/core-ledger-client'
import {
    type SettlementInfo,
    type AllocationView,
} from '@canton-network/core-token-standard'
import { useConnection } from '../contexts/ConnectionContext'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useRegistryUrls } from '../contexts/RegistryServiceContext'
import { useAllocationRequests } from '../hooks/useAllocationRequests'
import { useAllocations } from '../hooks/useAllocations'
import {
    type TransferLegInputFields,
    TransferLegInput,
} from './TransferLegInput'
import { DateTimePicker } from './DateTimePicker'
import { AllocationCard } from './AllocationCard'
import { AllocationRequestCard } from './AllocationRequestCard'

export const AllocationsTab: React.FC = () => {
    const registryUrls = useRegistryUrls()
    const portfolio = usePortfolio()
    const {
        status: { primaryParty },
    } = useConnection()

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
    }, [allocationRequests, allocations])

    const [executor, setExecutor] = useState('')
    const [settlementRefId, setSettlementRefId] = useState('')
    const [requestedAt, setRequestedAt] = useState(new Date())
    const defaultDeadline = new Date(requestedAt)
    defaultDeadline.setDate(defaultDeadline.getDate() + 7)
    const [allocateBefore, setAllocateBefore] = useState(defaultDeadline)
    const [settleBefore, setSettleBefore] = useState(defaultDeadline)
    const [transferLeg, setTransferLeg] = useState<TransferLegInputFields>({
        transferLegId: '',
        sender: '',
        receiver: '',
        amount: '',
        instrument: undefined,
    })

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

            <h2>Create allocation</h2>

            <form onSubmit={(e) => e.preventDefault()}>
                <h3>Settlement</h3>

                <label htmlFor="executor">Executor</label>
                <input
                    id="executor"
                    value={executor}
                    onChange={(e) => setExecutor(e.target.value)}
                />
                <br />

                <label htmlFor="settlementRefId">Settlement Ref ID</label>
                <input
                    id="settlementRefId"
                    value={settlementRefId}
                    onChange={(e) => setSettlementRefId(e.target.value)}
                />
                <br />

                <label htmlFor="requestedAt">Requested at</label>
                <DateTimePicker
                    id="requestedAt"
                    value={requestedAt}
                    onChange={(d) => setRequestedAt(d)}
                />
                <br />

                <label htmlFor="allocateBefore">Allocate before</label>
                <DateTimePicker
                    id="allocateBefore"
                    value={allocateBefore}
                    onChange={(d) => setAllocateBefore(d)}
                />
                <br />

                <label htmlFor="settleBefore">Settle before</label>
                <DateTimePicker
                    id="settleBefore"
                    value={settleBefore}
                    onChange={(d) => setSettleBefore(d)}
                />
                <br />

                <h3>Transfer Leg</h3>

                <TransferLegInput
                    value={transferLeg}
                    onChange={(v) => setTransferLeg(v)}
                />

                <button
                    type="submit"
                    disabled={!transferLeg.instrument}
                    onClick={() => {
                        portfolio.createAllocationInstruction({
                            registryUrls,
                            party: primaryParty!,
                            allocationSpecification: {
                                settlement: {
                                    executor,
                                    settlementRef: {
                                        id: settlementRefId,
                                        cid: null, // TODO
                                    },
                                    requestedAt: requestedAt.toISOString(),
                                    allocateBefore:
                                        allocateBefore.toISOString(),
                                    settleBefore: settleBefore.toISOString(),
                                    meta: { values: {} },
                                },
                                transferLegId: 'foo',
                                transferLeg: {
                                    ...transferLeg,
                                    instrumentId: transferLeg.instrument!,
                                    meta: { values: {} },
                                },
                            },
                        })
                    }}
                >
                    Create Allocation
                </button>
            </form>
        </div>
    )
}
