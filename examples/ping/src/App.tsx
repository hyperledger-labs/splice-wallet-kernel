import { useContext, useEffect, useState } from 'react'
import './App.css'
import * as sdk from '@canton-network/dapp-sdk'
import { useAccounts } from './hooks/useAccounts'
import { useConnect } from './hooks/useConnect'
import { useClientConnect } from './hooks/useClientConnect'
import { Status } from './components/Status'
import { ErrorContext } from './ErrorContext'
import { LedgerQuery } from './components/LedgerQuery'
import { LedgerSubmission } from './components/LedgerSubmission'
import { Accounts } from './components/Accounts'
import { PostEvents } from './components/PostEvents'
import { WindowMessages } from './components/WindowMessages'
import { useStatus } from './hooks/useStatus'

type ConnectMode = 'legacy' | 'client'

function App() {
    const { errorMsg, setErrorMsg } = useContext(ErrorContext)
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<string>('accounts')
    const [connectMode, setConnectMode] = useState<ConnectMode | null>(null)

    const legacy = useConnect()
    const client = useClientConnect()

    const connectResult =
        connectMode === 'client'
            ? client.connectResult
            : legacy.connectResult

    const { status, statusEvent } = useStatus()

    const accounts = useAccounts(connectResult)
    const primaryParty = accounts?.find((w) => w.primary)?.partyId

    const [ledgerApiVersion, setLedgerApiVersion] = useState<string>()

    useEffect(() => {
        if (connectResult?.isNetworkConnected) {
            sdk.ledgerApi({
                requestMethod: 'GET',
                resource: '/v2/version',
            }).then((result) => {
                const version = JSON.parse(result.response).version
                setLedgerApiVersion(version)
            })
        }
    }, [connectResult])

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
                    {connectResult?.isConnected ? (
                        <button
                            disabled={loading}
                            onClick={() => {
                                setLoading(true)
                                const doDisconnect =
                                    connectMode === 'client'
                                        ? client.disconnect
                                        : legacy.disconnect
                                doDisconnect().then(() => {
                                    setLoading(false)
                                    setConnectMode(null)
                                })
                            }}
                        >
                            disconnect{connectMode ? ` (${connectMode})` : ''}
                        </button>
                    ) : (
                        <>
                            <button
                                disabled={loading}
                                onClick={() => {
                                    console.log('Connecting via legacy SDK...')
                                    setLoading(true)
                                    legacy
                                        .connect()
                                        .then(() => {
                                            setLoading(false)
                                            setErrorMsg('')
                                            setConnectMode('legacy')
                                            status()
                                        })
                                        .catch((err) => {
                                            console.log(err)
                                            setLoading(false)
                                            setErrorMsg(err.details)
                                        })
                                }}
                            >
                                connect (legacy)
                            </button>
                            <button
                                disabled={loading}
                                onClick={() => {
                                    console.log('Connecting via DappClient wallet picker...')
                                    setLoading(true)
                                    client
                                        .init()
                                        .then(() => client.connect())
                                        .then(() => {
                                            setLoading(false)
                                            setErrorMsg('')
                                            setConnectMode('client')
                                        })
                                        .catch((err) => {
                                            console.log(err)
                                            setLoading(false)
                                            setErrorMsg(
                                                err instanceof Error
                                                    ? err.message
                                                    : String(err)
                                            )
                                        })
                                }}
                            >
                                connect (wallet picker)
                            </button>
                        </>
                    )}
                    <button
                        disabled={!connectResult?.isConnected || loading}
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
                <Status
                    status={statusEvent}
                    ledgerApiVersion={ledgerApiVersion}
                />
                <br />
            </div>

            <div className="tabs">
                <div className="tab-buttons">
                    {connectResult?.isConnected && (
                        <button
                            className={activeTab === 'accounts' ? 'active' : ''}
                            onClick={() => setActiveTab('accounts')}
                        >
                            Accounts
                        </button>
                    )}
                    {window.canton && (
                        <button
                            className={
                                activeTab === 'postEvents' ? 'active' : ''
                            }
                            onClick={() => setActiveTab('postEvents')}
                        >
                            Post Events
                        </button>
                    )}
                    <button
                        className={
                            activeTab === 'windowMessages' ? 'active' : ''
                        }
                        onClick={() => setActiveTab('windowMessages')}
                    >
                        Window Messages
                    </button>
                    {connectResult?.isConnected && (
                        <button
                            className={
                                activeTab === 'ledgerQuery' ? 'active' : ''
                            }
                            onClick={() => setActiveTab('ledgerQuery')}
                        >
                            Ledger Query
                        </button>
                    )}
                    {connectResult?.isConnected && (
                        <button
                            className={
                                activeTab === 'ledgerSubmission' ? 'active' : ''
                            }
                            onClick={() => setActiveTab('ledgerSubmission')}
                        >
                            Ledger Submission
                        </button>
                    )}
                </div>

                <div className="tab-content">
                    <div
                        style={{
                            display:
                                activeTab === 'accounts' ? 'block' : 'none',
                        }}
                    >
                        <Accounts connectResult={connectResult} />
                    </div>
                    <div
                        style={{
                            display:
                                activeTab === 'postEvents' ? 'block' : 'none',
                        }}
                    >
                        <PostEvents connectResult={connectResult} />
                    </div>
                    <div
                        style={{
                            display:
                                activeTab === 'windowMessages'
                                    ? 'block'
                                    : 'none',
                        }}
                    >
                        <WindowMessages />
                    </div>
                    <div
                        style={{
                            display:
                                activeTab === 'ledgerQuery' ? 'block' : 'none',
                        }}
                    >
                        <LedgerQuery
                            connectResult={connectResult}
                            primaryParty={primaryParty}
                            ledgerApiVersion={ledgerApiVersion}
                        />
                    </div>
                    <div
                        style={{
                            display:
                                activeTab === 'ledgerSubmission'
                                    ? 'block'
                                    : 'none',
                        }}
                    >
                        <LedgerSubmission
                            connectResult={connectResult}
                            primaryParty={primaryParty}
                            ledgerApiVersion={ledgerApiVersion}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
