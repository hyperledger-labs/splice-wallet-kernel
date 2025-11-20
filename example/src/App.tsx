import { useEffect, useState } from 'react'
import './App.css'
import * as sdk from '@canton-network/dapp-sdk'
import { createPingCommand } from './commands/createPingCommand'

function App() {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<sdk.dappAPI.StatusEvent | undefined>()
    const [infoMsg, setInfoMsg] = useState('')
    const [error, setError] = useState('')
    const [messages, setMessages] = useState<string[]>([])
    const [queryResponse, setQueryResponse] = useState<object | undefined>()
    const [primaryParty, setPrimaryParty] = useState<string>()
    const [, setAccounts] = useState<sdk.dappAPI.RequestAccountsResult>([])
    const [ledgerApiVersion, setLedgerApiVersion] = useState<
        string | undefined
    >()

    // First effect: fetch status on mount
    useEffect(() => {
        const provider = window.canton // either postMsg provider or httpProvider
        if (!provider) {
            return
        }
        provider
            .request<sdk.dappAPI.StatusEvent>({ method: 'status' })
            .then((result) => {
                console.log(result)
                setStatus(result)
                if (result.isNetworkConnected) {
                    sdk.ledgerApi({
                        requestMethod: 'GET',
                        resource: '/v2/version',
                    }).then((result) => {
                        const version = JSON.parse(result.response).version
                        setLedgerApiVersion(version)
                    })
                }
            })
            .catch(() => setInfoMsg('failed to get status'))

        // Listen for connected events from the provider
        const messageListener = (event: sdk.dappAPI.TxChangedEvent) => {
            setMessages((prev) => [JSON.stringify(event), ...prev])
        }
        const onAccountsChanged = (
            wallets: sdk.dappAPI.AccountsChangedEvent
        ) => {
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
    }, [])

    // Second effect: request accounts only when connected
    useEffect(() => {
        const provider = window.canton
        if (!provider || !status?.isConnected) {
            return
        }
        provider
            .request({
                method: 'requestAccounts',
            })
            .then((wallets) => {
                const requestedAccounts =
                    wallets as sdk.dappAPI.RequestAccountsResult
                setAccounts(requestedAccounts)
                console.log(requestedAccounts)
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
    }, [status?.isConnected])

    function createPingContract() {
        setError('')
        setLoading(true)
        const provider = window.canton

        if (provider !== undefined) {
            provider
                .request({
                    method: 'prepareExecute',
                    params: createPingCommand(ledgerApiVersion, primaryParty!),
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
                                setLoading(true)
                                sdk.disconnect().then(() => {
                                    setStatus({ ...status, isConnected: false })
                                    setPrimaryParty(undefined)
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
                        disabled={!primaryParty}
                        onClick={() => {
                            setLoading(true)
                            const packageName = ledgerApiVersion?.startsWith(
                                '3.3.'
                            )
                                ? 'AdminWorkflows'
                                : 'canton-builtin-admin-workflow-ping'
                            const queryString = new URLSearchParams([
                                ['package-name', packageName],
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
                {infoMsg && (
                    <p>
                        <b>Info:</b>
                        <i>{infoMsg}</i>
                    </p>
                )}
                {status && (
                    <p>
                        <b>Wallet Gateway:</b>
                        <br />
                        <b>gateway:</b> <i>{status!.kernel.id}</i>
                        <br />
                        <b>connected:</b>{' '}
                        <i>{status.isConnected ? '🟢' : '🔴'}</i>
                        {status.networkId && (
                            <span>
                                <br />
                                <b>network:</b> <i>{status.networkId}</i>
                            </span>
                        )}
                        {ledgerApiVersion && (
                            <span>
                                <br />
                                <b>Ledger API version:</b>{' '}
                                <i>{ledgerApiVersion}</i>
                            </span>
                        )}
                    </p>
                )}
                <br />
                {status && (
                    <p>
                        <b>primary party:</b> <br />
                        <i>{primaryParty}</i>
                    </p>
                )}
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
