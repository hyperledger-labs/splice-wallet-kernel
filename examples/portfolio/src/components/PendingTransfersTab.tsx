import { useState, useEffect } from 'react'
import {
    type PendingTransfer,
    getPendingTransfers,
} from '../utils/getPendingTransfers.js'
import { acceptTransfer } from '../utils/acceptTransfer.js'

export type PendingTransfersTabProps = {
    party: string
    sessionToken?: string // used to tap
}

export const PendingTransfersTab: React.FC<PendingTransfersTabProps> = ({
    party,
    sessionToken,
}) => {
    const [pendingTransfers, setPendingTransfers] = useState<
        PendingTransfer[] | undefined
    >(undefined)

    const refreshPendingTransfers = async () => {
        const hs = await getPendingTransfers({
            party,
            sessionToken: sessionToken!,
        })
        console.log(hs)
        setPendingTransfers(hs)
    }

    useEffect(() => {
        refreshPendingTransfers()
    }, [party])

    const PendingTransfer = (p: PendingTransfer) => (
        <div>
            amount: <strong>{p.amount}</strong> <br />
            sender: <strong>{p.sender}</strong> <br />
            receiver: <strong>{p.receiver}</strong> <br />
            {p.incoming && (
                <button
                    disabled={!sessionToken}
                    onClick={() => {
                        acceptTransfer({
                            sessionToken: sessionToken!,
                            party,
                            contractId: p.contractId,
                        })
                    }}
                >
                    Accept
                </button>
            )}
        </div>
    )

    return (
        <div>
            <h2>Incoming</h2>
            <ul>
                {pendingTransfers
                    ?.filter((p) => p.incoming)
                    .map((p) => (
                        <li key={p.contractId}>{PendingTransfer(p)}</li>
                    ))}
            </ul>
            <h2>Outgoing</h2>
            <ul>
                {pendingTransfers
                    ?.filter((p) => !p.incoming)
                    .map((p) => (
                        <li key={p.contractId}>{PendingTransfer(p)}</li>
                    ))}
            </ul>
        </div>
    )
}
