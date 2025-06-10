import { useState } from 'react'
import './App.css'
import * as sdk from 'canton-wallet-sdk'

function App() {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState('disconnected')

    return (
        <div>
            <h1>Example dApp</h1>
            <div className="card">
                <button
                    disabled={loading}
                    onClick={() => {
                        console.log('Connecting to Wallet Kernel...')
                        setLoading(true)
                        sdk.discoverWallets()
                            .then((wallets) => {
                                console.log('Discovered wallets:', wallets)
                                setLoading(false)
                                setStatus(
                                    `connected on ${wallets.map((w) => w.url).join(', ')}`
                                )
                            })
                            .catch((err) => {
                                console.error('Error setting status:', err)
                                setStatus('error')
                            })
                    }}
                >
                    connect to wallet kernel
                </button>
                {loading && <p>Loading...</p>}
                <p>status: {status}</p>
            </div>
        </div>
    )
}

export default App
