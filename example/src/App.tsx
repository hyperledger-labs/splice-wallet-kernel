import { useEffect, useState } from 'react'
import './App.css'
import * as sdk from '@canton-network/dapp-sdk'
import { createPingCommand } from './commands/createPingCommand'

function statusInfo(status?: sdk.dappAPI.StatusEvent) {
    if (!status) {
        return 'status: 🔴 disconnected'
    }

    return `Wallet Gateway: ${status.kernel.id}, status: ${
        status.isConnected ? '🟢 connected' : '🔴 disconnected'
    }, network: ${status.networkId}`
}

function App() {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<sdk.dappAPI.StatusEvent | undefined>()
    const [infoMsg, setInfoMsg] = useState('')
    const [error, setError] = useState('')
    const [messages, setMessages] = useState<string[]>([])
    const [queryResponse, setQueryResponse] = useState<object | undefined>()
    const [primaryParty, setPrimaryParty] = useState<string>()
    const [accounts, setAccounts] = useState<sdk.dappAPI.RequestAccountsResult>(
        []
    )

    useEffect(() => {
        setInfoMsg(statusInfo(status))
    }, [status])

    useEffect(() => {
        const provider = window.canton // either postMsg provider or httpProvider

        if (!provider) {
            return
        }

        // Attempt to get WK status on initial load
        provider
            .request<sdk.dappAPI.StatusEvent>({ method: 'status' })
            .then((result) => {
                setStatus(result)
            })
            .catch(() => setInfoMsg('failed to get status'))

        provider
            .request({
                method: 'requestAccounts',
            })
            .then((wallets) => {
                const requestedAccounts =
                    wallets as sdk.dappAPI.RequestAccountsResult
                setAccounts(requestedAccounts)
                console.log('accounts are ' + JSON.stringify(accounts))

                if (requestedAccounts?.length > 0) {
                    const primaryWallet = requestedAccounts.find(
                        (w) => w.primary
                    )
                    setPrimaryParty(primaryWallet?.partyId)
                } else {
                    setPrimaryParty(undefined)
                }
            })
            .catch((err) => {
                console.error('Error requesting wallets:', err)
                setError(err instanceof Error ? err.message : String(err))
            })

        const messageListener = (event: sdk.dappAPI.TxChangedEvent) => {
            setMessages((prev) => [...prev, JSON.stringify(event)])
        }

        const onAccountsChanged = (
            wallets: sdk.dappAPI.AccountsChangedEvent
        ) => {
            // messageListener(wallets)
            if (wallets.length > 0) {
                const primaryWallet = wallets.find((w) => w.primary)
                setPrimaryParty(primaryWallet?.partyId)
            } else {
                setPrimaryParty(undefined)
            }
        }

        const onStatusChanged = (status: sdk.dappAPI.StatusEvent) => {
            console.log('Status changed event: ', status)
            setStatus(status)
        }

        // Listen for connected events from the provider
        // This will be triggered when the user connects to the Wallet Gateway
        provider.on<sdk.dappAPI.TxChangedEvent>('txChanged', messageListener)
        provider.on<sdk.dappAPI.AccountsChangedEvent>(
            'accountsChanged',
            onAccountsChanged
        )
        provider.on<sdk.dappAPI.StatusEvent>('statusChanged', onStatusChanged)

        return () => {
            provider.removeListener('txChanged', messageListener)
            provider.removeListener('accountsChanged', onAccountsChanged)
            provider.removeListener('statusChanged', onStatusChanged)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function createPingContract() {
        setError('')
        setLoading(true)
        const provider = window.canton

        if (provider !== undefined) {
            provider
                .request({
                    method: 'prepareExecute',
                    params: createPingCommand(primaryParty!),
                })
                .then(() => {
                    setLoading(false)
                })
                .catch((err) => {
                    console.error('Error creating ping contract:', err)
                    setLoading(false)
                    setError(err instanceof Error ? err.message : String(err))
                })
        }
    }

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
                                console.log(
                                    'Disconnecting from Wallet Gateway...'
                                )
                                setLoading(true)
                                sdk.disconnect().then(() => setLoading(false))
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
                                sdk.connect()
                                    .then(({ status }) => {
                                        setLoading(false)
                                        setStatus(status)
                                        setError('')
                                    })
                                    .catch((err) => {
                                        console.error(
                                            'Error setting status:',
                                            err
                                        )
                                        setLoading(false)
                                        setInfoMsg('error')
                                        setError(err.details)
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
                    <button
                        disabled={!primaryParty}
                        onClick={createPingContract}
                    >
                        create Ping contract
                    </button>
                    <button
                        disabled={loading}
                        onClick={() => {
                            setLoading(true)
                            const queryString = new URLSearchParams([
                                ['package-name', 'AdminWorkflows'],
                                ['parties', primaryParty!],
                            ]).toString()
                            sdk.ledgerApi({
                                requestMethod: 'GET',
                                resource: `/v2/interactive-submission/preferred-package-version?${queryString}`,
                            }).then((r) => {
                                setQueryResponse(JSON.parse(r.response))
                                setLoading(false)
                            })
                        }}
                    >
                        query preferred package version
                    </button>
                </div>
                {loading && <p>Loading...</p>}
                <p>{infoMsg}</p>
                <p>primary party: {primaryParty}</p>
                {error && (
                    <p className="error">Error: {JSON.stringify(error)}</p>
                )}
            </div>

            <div className="card">
                <h2>Latest Query Response</h2>
                <pre>
                    <p>{JSON.stringify(queryResponse, null, 2)}</p>
                </pre>
            </div>

            <div className="card">
                <h2>Events</h2>
                <pre>
                    {messages
                        .filter((msg) => !!msg)
                        .map((msg) => (
                            <p key={msg}>{msg}</p>
                        ))}
                </pre>
            </div>
        </div>
    )
}

export default App
