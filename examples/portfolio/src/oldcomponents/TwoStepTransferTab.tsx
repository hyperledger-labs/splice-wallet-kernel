import { useEffect, useState } from 'react'
import { useRegistries } from '../contexts/RegistriesContext.js'
import { useConnection } from '../contexts/ConnectionContext.js'
import { usePortfolio } from '../contexts/PortfolioContext.js'

export const TwoStepTransferTab: React.FC = () => {
    const {
        status: { primaryParty },
    } = useConnection()
    const { registries } = useRegistries()
    const { listHoldings, createTransfer } = usePortfolio()
    const [receiver, setReceiver] = useState<string>('')
    const [amount, setAmount] = useState<number>(100)
    const [memo, setMemo] = useState<string>('')
    const [transferableInstrumentIds, setTransferableInstrumentIds] = useState<
        { admin: string; id: string }[]
    >([])
    const [selectedInstrumentIdx, setSelectedInstrumentIdx] = useState(0)

    useEffect(() => {
        if (primaryParty) {
            listHoldings({ party: primaryParty }).then((holdings) => {
                const keys = new Set<string>()
                const uniqueInstrumentIds: { admin: string; id: string }[] = []
                for (const holding of holdings) {
                    const instrumentId = holding.instrumentId
                    const key = JSON.stringify([
                        instrumentId.admin,
                        instrumentId.id,
                    ])
                    if (!keys.has(key)) {
                        keys.add(key)
                        uniqueInstrumentIds.push(instrumentId)
                    }
                }
                setTransferableInstrumentIds(uniqueInstrumentIds)
            })
        }
    }, [primaryParty, listHoldings])

    return (
        <form onSubmit={(e) => e.preventDefault()}>
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
                onChange={(e) => setMemo(e.target.value)}
            />
            <br />
            <button
                type="submit"
                disabled={!primaryParty}
                onClick={() => {
                    createTransfer({
                        registryUrls: registries,
                        instrumentId:
                            transferableInstrumentIds[selectedInstrumentIdx],
                        sender: primaryParty!,
                        receiver,
                        amount,
                        memo: memo ? memo : undefined,
                    })
                }}
            >
                Transfer
            </button>
        </form>
    )
}
