import { useEffect, useState } from 'react'
import './App.css'
import * as sdk from 'splice-wallet-sdk'

function App() {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState('disconnected')
    const [error, setError] = useState('')
    const [messages, setMessages] = useState<string[]>([])

    useEffect(() => {
        const provider = window.splice

        const messageListener = (event: unknown) => {
            setMessages((prev) => [...prev, JSON.stringify(event)])
        }

        if (provider) {
            provider.on('message', messageListener)
            provider.on('connect', messageListener)
        }

        return () => {
            provider?.removeListener('message', messageListener)
            provider?.removeListener('connect', messageListener)
        }
    }, [status])

    return (
        <div>
            <h1>Example dApp</h1>
            <div className="card">
                <button
                    disabled={loading}
                    onClick={() => {
                        console.log('Connecting to Wallet Kernel...')
                        setLoading(true)
                        sdk.connect()
                            .then(({ url }) => {
                                setLoading(false)
                                setStatus(`connected on ${url}`)
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
                {loading && <p>Loading...</p>}
                <p>status: {status}</p>
                {error && <p className="error">Error: {error}</p>}
            </div>

            <div className="card">
                <h2>Events</h2>
                <pre>
                    {messages.map((msg) => (
                        <p key={msg}>{msg}</p>
                    ))}
                </pre>
            </div>
        </div>
    )
}

export default App
