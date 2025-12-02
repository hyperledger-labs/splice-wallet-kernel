import { useState } from 'react'
import { createTransfer } from '../utils/createTransfer.js'

export type TwoStepTransferTabProps = {
    party: string
    sessionToken?: string // used to tap
}

export const TwoStepTransferTab: React.FC<TwoStepTransferTabProps> = ({
    party,
    sessionToken,
}) => {
    const [receiver, setReceiver] = useState<string>('')
    const [amount, setAmount] = useState<number>(100)
    const [memo, setMemo] = useState<string | undefined>(undefined)

    return (
        <div>
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
                disabled={!sessionToken}
                onClick={() => {
                    createTransfer({
                        sessionToken: sessionToken!,
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
