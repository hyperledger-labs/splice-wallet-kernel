import { useState } from 'react'
import './App.css'
import * as sdk from 'splice-wallet-sdk'

function App() {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState('disconnected')
    const [error, setError] = useState('')

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
        </div>
    )
}

export default App
