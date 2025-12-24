// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SelectInstrument } from './SelectInstrument.js'

export type TransferLegInputFields = {
    transferLegId: string
    sender: string
    receiver: string
    amount: string
    instrument: { admin: string; id: string } | undefined
}

export type TransferLegInputProps = {
    value: TransferLegInputFields
    onChange: (_: TransferLegInputFields) => void
}

export const TransferLegInput: React.FC<TransferLegInputProps> = ({
    value,
    onChange,
}) => {
    return (
        <div>
            <label htmlFor="transferLegId">Transfer Leg ID</label>
            <input
                id="transferLegId"
                value={value.transferLegId}
                onChange={(e) =>
                    onChange({ ...value, transferLegId: e.target.value })
                }
            />
            <br />

            <label htmlFor="sender">Sender</label>
            <input
                id="sender"
                value={value.sender}
                onChange={(e) => onChange({ ...value, sender: e.target.value })}
            />
            <br />

            <label htmlFor="receiver">Receiver</label>
            <input
                id="receiver"
                value={value.receiver}
                onChange={(e) =>
                    onChange({ ...value, receiver: e.target.value })
                }
            />
            <br />

            <label htmlFor="instrument">Instrument</label>
            <SelectInstrument
                value={value.instrument}
                onChange={(instrument) => onChange({ ...value, instrument })}
            />
            <br />

            <label htmlFor="amount">Amount</label>
            <input
                id="amount"
                type="number"
                value={value.amount}
                onChange={(e) => onChange({ ...value, amount: e.target.value })}
            />
            <br />
        </div>
    )
}
