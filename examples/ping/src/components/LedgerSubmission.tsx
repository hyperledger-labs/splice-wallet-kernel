import { useContext, useState } from 'react'
import { ErrorContext } from '../ErrorContext'
import { createPingCommand } from '../commands/createPingCommand'
import { useTransactions } from '../hooks/useTransactions'

import * as sdk from '@canton-network/dapp-sdk'
import { prettyjson } from '../utils'

export function LedgerSubmission(props: {
    primaryParty?: string
    ledgerApiVersion?: string
    connectResult?: sdk.dappAPI.ConnectResult
}) {
    const { setErrorMsg } = useContext(ErrorContext)
    const [loading, setLoading] = useState(false)

    const transactions = useTransactions(props.connectResult)
    const connected = props.connectResult?.isConnected ?? false

    function createPingContract() {
        setErrorMsg('')
        setLoading(true)

        sdk.prepareExecute(
            createPingCommand(props.ledgerApiVersion, props.primaryParty!)
        )
            .then(() => {
                setLoading(false)
            })
            .catch((err) => {
                console.error('Error creating ping contract:', err)
                setLoading(false)
                setErrorMsg(
                    err instanceof Error ? err.message : JSON.stringify(err)
                )
            })
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
                {transactions.length > 0 && (
                    <div>
                        <p>Total transactions: {transactions.length}</p>
                        <div className="terminal-display">
                            <pre>
                                {transactions.map(prettyjson).map((msg) => (
                                    <p key={msg}>{msg}</p>
                                ))}
                            </pre>
                        </div>
                    </div>
                )}{' '}
            </div>
        )
    )
}
