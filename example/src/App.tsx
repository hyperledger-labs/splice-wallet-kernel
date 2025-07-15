import { useEffect, useState } from 'react'
import './App.css'
import * as sdk from 'splice-wallet-sdk'
import { createPingCommand } from './commands/createPingCommand'

function App() {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState('')
    const [error, setError] = useState('')
    const [messages, setMessages] = useState<string[]>([])
    const [primaryParty, setPrimaryParty] = useState<string>()

    useEffect(() => {
        const provider = window.splice

        if (!provider) {
            setStatus('Splice provider not found')
            return
        }

        // Attempt to get WK status on initial load
        provider
            .request<sdk.dappAPI.StatusResult>({ method: 'status' })
            .then((result) => {
                setStatus(
                    `Wallet Kernel: ${result.kernel.id}, status: ${result.isConnected ? 'connected' : 'disconnected'}, chain: ${result.chainId}`
                )
            })
            .catch(() => setStatus('disconnected'))

        // Listen for connected events from the provider
        // This will be triggered when the user connects to the wallet kernel
        provider.on<sdk.dappAPI.OnConnectedEvent>('onConnected', (result) => {
            console.log('DAPP: Connected to Wallet Kernel:', result)
            setStatus(
                `Wallet Kernel: ${result.kernel.id}, status: ${result.isConnected ? 'connected' : 'disconnected'}, chain: ${result.chainId}`
            )
            setMessages((prev) => [...prev, JSON.stringify(result)])
        })

        const messageListener = (event: unknown) => {
            setMessages((prev) => [...prev, JSON.stringify(event)])
        }

        const onAccountsChanged = (event: unknown) => {
            const wallets = event as { primary: boolean; partyId: string }[]

            setMessages((prev) => [...prev, JSON.stringify(event)])

            if (wallets.length > 0) {
                const primaryWallet = wallets.find((w) => w.primary)
                setPrimaryParty(primaryWallet?.partyId)
            } else {
                setPrimaryParty(undefined)
            }
        }

        if (provider) {
            provider.on('connect', messageListener)
            provider.on('txChanged', messageListener)
            provider.on('accountsChanged', onAccountsChanged)
        }

        return () => {
            provider?.removeListener('connect', messageListener)
            provider?.removeListener('txChanged', messageListener)
            provider?.removeListener('accountsChanged', onAccountsChanged)
        }
    }, [status])

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
                            console.log('Connecting to Wallet Kernel...')
                            setLoading(true)
                            sdk.connect()
                                .then(({ kernel, isConnected, chainId }) => {
                                    setLoading(false)
                                    setStatus(
                                        `Wallet Kernel: ${kernel.id}, status: ${isConnected ? 'connected' : 'disconnected'}, chain: ${chainId}`
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
                        connect to wallet kernel
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
