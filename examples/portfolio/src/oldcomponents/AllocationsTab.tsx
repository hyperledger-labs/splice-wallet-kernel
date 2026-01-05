// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from 'react'
import { type AllocationRequestView } from '@canton-network/core-token-standard'
import { type PrettyContract } from '@canton-network/core-ledger-client'
import { useConnection } from '../contexts/ConnectionContext'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useRegistryUrls } from '../contexts/RegistryServiceContext'
import {
    type TransferLegInputFields,
    TransferLegInput,
} from './TransferLegInput'
import { DateTimePicker } from './DateTimePicker'
import { AllocationRequestCard } from './AllocationRequestCard'

export const AllocationsTab: React.FC = () => {
    const registryUrls = useRegistryUrls()
    const portfolio = usePortfolio()
    const {
        status: { primaryParty },
    } = useConnection()

    const [pendingAllocationRequests, setPendingAllocationRequests] = useState<
        PrettyContract<AllocationRequestView>[] | undefined
    >(undefined)

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
                const pendingAllocationInstructions =
                    await portfolio.listPendingAllocationInstructions({
                        party: primaryParty,
                    })
                console.log(
                    'pendingAllocationInstructions',
                    pendingAllocationInstructions
                )
                const pendingAllocationRequests =
                    await portfolio.listPendingAllocationRequests({
                        party: primaryParty,
                    })
                console.log(
                    'pendingAllocationRequests',
                    pendingAllocationRequests
                )
                setPendingAllocationRequests(pendingAllocationRequests)
                const pendingAllocations =
                    await portfolio.listPendingAllocations({
                        party: primaryParty,
                    })
                console.log('pendingAllocations', pendingAllocations)
            })()
        }
    }, [portfolio, primaryParty])

    return (
        <div>
            <h2>Allocation requests</h2>

            {primaryParty &&
                pendingAllocationRequests?.map((p) => (
                    <div key={p.contractId}>
                        <AllocationRequestCard
                            party={primaryParty!}
                            allocationRequest={p.interfaceViewValue}
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
