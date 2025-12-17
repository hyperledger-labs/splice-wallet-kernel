// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from 'react'
import { useConnection } from '../contexts/ConnectionContext.js'
import { usePortfolio } from '../contexts/PortfolioContext.js'
import { useRegistryUrls } from '../contexts/RegistryServiceContext.js'
import { SelectInstrument } from './SelectInstrument.js'
import { DateTimePicker } from './DateTimePicker.js'

export const AllocationsTab: React.FC = () => {
    const registryUrls = useRegistryUrls()
    const portfolio = usePortfolio()
    const {
        status: { primaryParty },
    } = useConnection()

    const [executor, setExecutor] = useState('')
    const [settlementRefId, setSettlementRefId] = useState('')
    const [requestedAt, setRequestedAt] = useState(new Date())
    const defaultDeadline = new Date(requestedAt)
    defaultDeadline.setDate(defaultDeadline.getDate() + 7)
    const [allocateBefore, setAllocateBefore] = useState(defaultDeadline)
    const [settleBefore, setSettleBefore] = useState(defaultDeadline)
    const [transferLegId, setTransferLegId] = useState('')
    const [sender, setSender] = useState('')
    const [receiver, setReceiver] = useState('')
    const [amount, setAmount] = useState('')
    const [instrument, setInstrument] = useState<
        { admin: string; id: string } | undefined
    >(undefined)

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

                <label htmlFor="transferLegId">Transfer Leg ID</label>
                <input
                    id="transferLegId"
                    value={transferLegId}
                    onChange={(e) => setTransferLegId(e.target.value)}
                />
                <br />

                <label htmlFor="sender">Sender</label>
                <input
                    id="sender"
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                />
                <br />

                <label htmlFor="receiver">Receiver</label>
                <input
                    id="receiver"
                    value={receiver}
                    onChange={(e) => setReceiver(e.target.value)}
                />
                <br />

                <label htmlFor="instrument">Instrument</label>
                <SelectInstrument
                    value={instrument}
                    onChange={(i) => setInstrument(i)}
                />
                <br />

                <label htmlFor="amount">Amount</label>
                <input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
                <br />

                <button
                    type="submit"
                    disabled={!instrument}
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
                                    sender,
                                    receiver,
                                    amount,
                                    instrumentId: instrument!,
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
