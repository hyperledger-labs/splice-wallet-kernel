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
import { Signing } from './components/Signing'
import { useStatus } from './hooks/useStatus'
import Holdings from './components/Holdings'

function App() {
    const { errorMsg, setErrorMsg } = useContext(ErrorContext)
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<string>('accounts')
    const [pickerMode, setPickerMode] = useState<'modal' | 'popup'>('modal')
    const [pickerTheme, setPickerTheme] = useState<'light' | 'dark'>('light')

    const { connect, disconnect, connectResult } = useConnect()

    // Switch between the SDK's default in-page modal picker and the popup picker.
    useEffect(() => {
        sdk.setWalletPicker(pickerMode === 'popup' ? sdk.pickWallet : undefined)
    }, [pickerMode])

    // Force the wallet discovery modal's color scheme.
    useEffect(() => {
        sdk.setWalletPickerModalTheme(pickerTheme)
    }, [pickerTheme])

    const { status, statusEvent } = useStatus()

    const accounts = useAccounts(connectResult)
    const primaryParty = accounts?.find((w) => w.primary)?.partyId

    const [ledgerApiVersion, setLedgerApiVersion] = useState<string>()

    useEffect(() => {
        if (connectResult?.isNetworkConnected) {
            sdk.ledgerApi({
                requestMethod: 'get',
                resource: '/v2/version',
            }).then((result) => {
                const version = result.version
                setLedgerApiVersion(version)
            })
        }
    }, [connectResult])

    return (
        <div>
            <h1>Example dApp</h1>
            <div
                style={{
                    display: 'flex',
                    gap: 16,
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    marginBottom: 12,
                }}
            >
                <Segmented
                    label="Picker"
                    value={pickerMode}
                    options={[
                        { label: 'Modal', value: 'modal' },
                        { label: 'Popup', value: 'popup' },
                    ]}
                    onChange={setPickerMode}
                />
                <Segmented
                    label="Theme"
                    value={pickerTheme}
                    options={[
                        { label: 'Light', value: 'light' },
                        { label: 'Dark', value: 'dark' },
                    ]}
                    onChange={setPickerTheme}
                />
            </div>
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
                            data-testid="disconnect-wallet"
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
                            data-testid="connect-wallet"
                            disabled={loading}
                            onClick={() => {
                                console.log('Connecting to Wallet...')
                                setLoading(true)
                                connect()
                                    .then(() => {
                                        setLoading(false)
                                        setErrorMsg('')
                                        status()
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
                            connect to Wallet
                        </button>
                    )}
                    <button
                        data-testid="open-wallet"
                        disabled={!connectResult?.isConnected || loading}
                        onClick={() => {
                            console.log('Opening to Wallet...')
                            sdk.open()
                        }}
                    >
                        open Wallet
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
                    {connectResult?.isConnected && (
                        <button
                            className={activeTab === 'holdings' ? 'active' : ''}
                            onClick={() => setActiveTab('holdings')}
                        >
                            Holdings
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
                    {connectResult?.isConnected && (
                        <button
                            className={activeTab === 'signing' ? 'active' : ''}
                            onClick={() => setActiveTab('signing')}
                        >
                            Signing
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
                                activeTab === 'holdings' ? 'block' : 'none',
                        }}
                    >
                        <Holdings connectResult={connectResult} />
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
                    <div
                        style={{
                            display: activeTab === 'signing' ? 'block' : 'none',
                        }}
                    >
                        <Signing connectResult={connectResult} />
                    </div>
                </div>
            </div>
        </div>
    )
}

interface SegmentedProps<T extends string> {
    label: string
    value: T
    options: { label: string; value: T }[]
    onChange: (value: T) => void
}

function Segmented<T extends string>({
    label,
    value,
    options,
    onChange,
}: SegmentedProps<T>) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, opacity: 0.7 }}>{label}</span>
            <div
                style={{
                    display: 'inline-flex',
                    border: '1px solid #d0d0d8',
                    borderRadius: 8,
                    overflow: 'hidden',
                }}
            >
                {options.map((opt) => {
                    const active = opt.value === value
                    return (
                        <button
                            key={opt.value}
                            onClick={() => onChange(opt.value)}
                            style={{
                                padding: '4px 12px',
                                fontSize: 13,
                                border: 'none',
                                borderRadius: 0,
                                cursor: 'pointer',
                                background: active ? '#111' : '#f4f4f7',
                                color: active ? '#fff' : '#333',
                            }}
                        >
                            {opt.label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default App
