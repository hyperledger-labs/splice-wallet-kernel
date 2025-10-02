import { useEffect, useState } from 'react'
import './App.css'
import * as sdk from '@canton-network/dapp-sdk'
import { createPingCommand } from './commands/createPingCommand'

function App() {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState('')
    const [error, setError] = useState('')
    const [messages, setMessages] = useState<string[]>([])
    const [primaryParty, setPrimaryParty] = useState<string>()
    const [accounts, setAccounts] = useState<sdk.dappAPI.RequestAccountsResult>(
        []
    )

    useEffect(() => {
        const provider = window.splice // either postMsg provider or httpProvider

        if (!provider) {
            setStatus('Splice provider not found')
            return
        }

        // Attempt to get WK status on initial load
        provider
            .request<sdk.dappAPI.StatusResult>({ method: 'status' })
            .then((result) => {
                setStatus(
                    `Wallet Gateway: ${result.kernel.id}, status: ${result.isConnected ? 'connected' : 'disconnected'}, chain: ${result.chainId}`
                )
            })
            .catch(() => setStatus('disconnected'))

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

        const messageListener = (event: unknown) => {
            setMessages((prev) => [...prev, JSON.stringify(event)])
        }

        const onAccountsChanged = (
            wallets: sdk.dappAPI.AccountsChangedEvent
        ) => {
            messageListener(wallets)
            if (wallets.length > 0) {
                const primaryWallet = wallets.find((w) => w.primary)
                setPrimaryParty(primaryWallet?.partyId)
            } else {
                setPrimaryParty(undefined)
            }
        }

        // Listen for connected events from the provider
        // This will be triggered when the user connects to the Wallet Gateway
        provider.on<sdk.dappAPI.TxChangedEvent>('txChanged', messageListener)
        provider.on<sdk.dappAPI.AccountsChangedEvent>(
            'accountsChanged',
            onAccountsChanged
        )

        return () => {
            provider.removeListener('txChanged', messageListener)
            provider.removeListener('accountsChanged', onAccountsChanged)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function createPingContract() {
        setError('')
        setLoading(true)
        const provider = window.splice

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
                        display: 'flex',
                        gap: '10px',
                        justifyContent: 'center',
                    }}
                >
                    <button
                        disabled={loading}
                        onClick={() => {
                            console.log('Connecting to Wallet Gateway...')
                            setLoading(true)
                            sdk.connect()
                                .then(({ kernel, isConnected, chainId }) => {
                                    setLoading(false)
                                    setStatus(
                                        `Wallet Gateway: ${kernel.id}, status: ${isConnected ? 'connected' : 'disconnected'}, chain: ${chainId}`
                                    )
                                    setError('')
                                })
                                .catch((err) => {
                                    console.error('Error setting status:', err)
                                    setLoading(false)
                                    setStatus('error')
                                    setError(err.details)
                                })
                        }}
                    >
                        connect to Wallet Gateway
                    </button>
                    <button
                        disabled={status.includes('disconnected') || loading}
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
                </div>
                {loading && <p>Loading...</p>}
                <p>{status}</p>
                <p>primary party: {primaryParty}</p>
                {error && <p className="error">Error: {error}</p>}
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
