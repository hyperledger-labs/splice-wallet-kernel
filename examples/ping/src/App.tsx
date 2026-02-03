import { useContext, useEffect, useState } from 'react'
import './App.css'
import * as sdk from '@canton-network/dapp-sdk'
import { useAccounts } from './hooks/useAccounts'
import { useConnect } from './hooks/useConnect'
import { Status } from './components/Status'
import { ErrorContext } from './ErrorContext'
import { LedgerQuery } from './components/LedgerQuery'
import { LedgerSubmission } from './components/LedgerSubmission'
import { Accounts } from './components/Accounts'
import { PostEvents } from './components/PostEvents'
import { WindowMessages } from './components/WindowMessages'

function App() {
    const { errorMsg, setErrorMsg } = useContext(ErrorContext)
    const [loading, setLoading] = useState(false)

    const { connect, disconnect, status } = useConnect()

    const accounts = useAccounts(status)
    const primaryParty = accounts?.find((w) => w.primary)?.partyId

    const [ledgerApiVersion, setLedgerApiVersion] = useState<string>()

    useEffect(() => {
        if (status?.isNetworkConnected) {
            sdk.ledgerApi({
                requestMethod: 'GET',
                resource: '/v2/version',
            }).then((result) => {
                const version = JSON.parse(result.response).version
                setLedgerApiVersion(version)
            })
        }
    }, [status])

    return (
        <div>
            <h1>Example dApp</h1>
            <div className="card">
                <div
                    style={{
                        gap: '10px',
                        display: 'flex',
                        justifyContent: 'center',
                    }}
                >
                    {status?.isConnected ? (
                        <button
                            disabled={loading}
                            onClick={() => {
                                setLoading(true)
                                disconnect().then(() => {
                                    setLoading(false)
                                })
                            }}
                        >
                            disconnect
                        </button>
                    ) : (
                        <button
                            disabled={loading}
                            onClick={() => {
                                console.log('Connecting to Wallet Gateway...')
                                setLoading(true)
                                connect()
                                    .then(() => {
                                        setLoading(false)
                                        setErrorMsg('')
                                    })
                                    .catch((err) => {
                                        console.log(err)
                                        setLoading(false)
                                        setErrorMsg(err.details)
                                    })
                            }}
                        >
                            connect to Wallet Gateway
                        </button>
                    )}
                    <button
                        disabled={!status?.isConnected || loading}
                        onClick={() => {
                            console.log('Opening to Wallet Gateway...')
                            sdk.open()
                        }}
                    >
                        open Wallet Gateway
                    </button>
                </div>
                {loading && <p>Loading...</p>}
                {errorMsg && (
                    <p className="error">
                        <b>Error:</b> <i>{errorMsg}</i>
                    </p>
                )}
                <Status status={status} ledgerApiVersion={ledgerApiVersion} />
                <br />
            </div>

            <Accounts status={status} />

            <PostEvents status={status}/>

            <WindowMessages />

            <LedgerQuery
                status={status}
                primaryParty={primaryParty}
                ledgerApiVersion={ledgerApiVersion}
            />

            <LedgerSubmission
                status={status}
                primaryParty={primaryParty}
                ledgerApiVersion={ledgerApiVersion}
            />
        </div>
    )
}

export default App
