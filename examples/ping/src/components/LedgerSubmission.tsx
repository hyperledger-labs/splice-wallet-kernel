import { useContext, useState } from 'react'
import { ErrorContext } from '../ErrorContext'
import { createPingCommand } from '../commands/createPingCommand'
import { useTransactions } from '../hooks/useTransactions'

import * as sdk from '@canton-network/dapp-sdk'

export function LedgerSubmission(props: {
    primaryParty?: string
    ledgerApiVersion?: string
    status?: sdk.dappAPI.StatusEvent
}) {
    const { setErrorMsg } = useContext(ErrorContext)
    const [loading, setLoading] = useState(false)

    const transactions = useTransactions(props.status)
    const connected = props.status?.isConnected ?? false

    function createPingContract() {
        setErrorMsg('')
        setLoading(true)
        const provider = window.canton

        if (provider !== undefined) {
            provider
                .request({
                    method: 'prepareExecute',
                    params: createPingCommand(
                        props.ledgerApiVersion,
                        props.primaryParty!
                    ),
                })
                .then(() => {
                    setLoading(false)
                })
                .catch((err) => {
                    console.error('Error creating ping contract:', err)
                    setLoading(false)
                    setErrorMsg(
                        err instanceof Error ? err.message : String(err)
                    )
                })
        }
    }

    return (
        connected && (
            <div className="card">
                <h2>Ledger Submission</h2>
                <button
                    disabled={!props.primaryParty || loading}
                    onClick={createPingContract}
                >
                    create Ping contract
                </button>
                <div
                    style={{
                        marginTop: '16px',
                        width: '900px',
                        height: '300px',
                        overflow: 'auto',
                        backgroundColor: '#000',
                        color: '#0f0',
                    }}
                >
                    <pre style={{ textAlign: 'left' }}>
                        {transactions
                            .map((tx) => JSON.stringify(tx, null, 2))
                            .map((msg) => (
                                <p key={msg}>{msg}</p>
                            ))}
                    </pre>
                </div>
            </div>
        )
    )
}
