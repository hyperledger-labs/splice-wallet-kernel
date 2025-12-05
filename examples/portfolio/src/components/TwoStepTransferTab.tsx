import { useEffect, useState } from 'react'
import { PartyId } from '@canton-network/core-types'
import { createTransfer } from '../utils/createTransfer.js'
import { getTransferableInstrumentIds } from '../utils/getHoldings.js'

export type TwoStepTransferTabProps = {
    registryUrls: Map<PartyId, string>
    party: string
    sessionToken?: string // used to tap
}

export const TwoStepTransferTab: React.FC<TwoStepTransferTabProps> = ({
    registryUrls,
    party,
}) => {
    const [receiver, setReceiver] = useState<string>('')
    const [amount, setAmount] = useState<number>(100)
    const [memo, setMemo] = useState<string | undefined>(undefined)
    const [transferableInstrumentIds, setTransferableInstrumentIds] = useState<
        { admin: string; id: string }[]
    >([])
    const [selectedInstrumentIdx, setSelectedInstrumentIdx] = useState(0)

    useEffect(() => {
        getTransferableInstrumentIds({ party }).then((instrumentIds) =>
            setTransferableInstrumentIds(instrumentIds)
        )
    }, [party])

    return (
        <div>
            <label htmlFor="instrument">Instrument&nbsp;</label>
            <select
                value={selectedInstrumentIdx}
                onChange={(e) =>
                    setSelectedInstrumentIdx(Number(e.target.value))
                }
            >
                {transferableInstrumentIds.map((instrument, idx) => (
                    <option key={idx} value={idx}>
                        {instrument.id}
                    </option>
                ))}
            </select>
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
            <label htmlFor="amount">Message for receiver:&nbsp;</label>
            <input
                id="memo"
                value={memo}
                onChange={(e) =>
                    setMemo(e.target.value ? e.target.value : undefined)
                }
            />
            <br />
            <button
                onClick={() => {
                    // TODO: combo box for held tokens
                    createTransfer({
                        registryUrls,
                        instrumentId:
                            transferableInstrumentIds[selectedInstrumentIdx],
                        sender: party,
                        receiver,
                        amount,
                        memo,
                    })
                }}
            >
                Transfer
            </button>
        </div>
    )
}
