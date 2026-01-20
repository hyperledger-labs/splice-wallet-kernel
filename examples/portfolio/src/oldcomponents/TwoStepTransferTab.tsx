// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import { usePrimaryAccount } from '../hooks/useAccounts'
import { useCreateTransfer } from '../hooks/useCreateTransfer'
import { SelectInstrument } from './SelectInstrument'

export const TwoStepTransferTab: React.FC = () => {
    const primaryParty = usePrimaryAccount()?.partyId
    const { mutate: createTransfer } = useCreateTransfer()
    const [receiver, setReceiver] = useState<string>('')
    const [amount, setAmount] = useState<number>(100)
    const [memo, setMemo] = useState<string>('')
    const [selectedInstrument, setSelectedInstrument] = useState<
        { admin: string; id: string } | undefined
    >(undefined)

    return (
        <form onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="instrument">Instrument&nbsp;</label>
            <SelectInstrument
                value={selectedInstrument}
                onChange={(instrument) => setSelectedInstrument(instrument)}
            />
            <br />
            <label htmlFor="receiver">Receiver:&nbsp;</label>
            <input
                id="receiver"
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
            />
            <br />
            <label htmlFor="amount">Amount to transfer:&nbsp;</label>
            <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
            />
            <br />
            <label htmlFor="memo">Message for receiver:&nbsp;</label>
            <input
                id="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
            />
            <br />
            <button
                type="submit"
                disabled={!primaryParty || !selectedInstrument}
                onClick={() => {
                    createTransfer({
                        instrumentId: selectedInstrument!,
                        sender: primaryParty!,
                        receiver,
                        amount: `${amount}`,
                        memo: memo ? memo : undefined,
                    })
                }}
            >
                Transfer
            </button>
        </form>
    )
}
