import { useEffect, useState } from 'react'
import './App.css'
import { HOLDING_INTERFACE_ID } from '@canton-network/core-token-standard'
import * as sdk from '@canton-network/dapp-sdk'
import { AssetCard } from './components/AssetCard'

type Holding = {
    contractId: string
    name?: string
    value: number
    symbol: string
}

async function getHoldings(party: string): Promise<Holding[]> {
    const ledgerEnd = await sdk.ledgerApi({
        requestMethod: 'GET',
        resource: '/v2/state/ledger-end',
    })
    const offset = JSON.parse(ledgerEnd.response).offset
    console.log('ledgerEnd', ledgerEnd)
    const activeContracts = await sdk.ledgerApi({
        requestMethod: 'POST',
        resource: '/v2/state/active-contracts',
        body: JSON.stringify({
            activeAtOffset: offset,
            filter: {
                filtersByParty: {
                    [party]: {
                        cumulative: [
                            {
                                identifierFilter: {
                                    InterfaceFilter: {
                                        value: {
                                            interfaceId: HOLDING_INTERFACE_ID,
                                            includeInterfaceView: true,
                                            includeCreatedEventBlob: true,
                                        },
                                    },
                                },
                            },
                        ],
                    },
                },
            },
        }),
    })
    console.log('active-contracts')
    const holdings = []
    for (const activeContract of JSON.parse(activeContracts.response)) {
        console.log(activeContract)
        const createdEvent =
            activeContract.contractEntry?.JsActiveContract?.createdEvent
        const view = createdEvent?.interfaceViews[0]
        const contractId = createdEvent?.contractId
        holdings.push({
            contractId,
            value: Number(view.viewValue?.amount),
            symbol: view.viewValue?.instrumentId?.id,
        })
    }
    return holdings
}

type AppState =
    | { status: 'connect' }
    | { status: 'connecting' }
    | { status: 'connected'; primaryParty?: string; holdings?: Holding[] }
    | { status: 'broken' }

function App() {
    const [state, setState] = useState<AppState>({ status: 'connect' })
    console.log('current state: ', state)

    const [errorMsg, setErrorMsg] = useState('')
    const [messages, setMessages] = useState<string[]>([])

    // First effect: fetch status on mount
    useEffect(() => {
        const provider = window.canton
        if (!provider) return
        provider
            .request<sdk.dappAPI.StatusEvent>({ method: 'status' })
            .then((result) => {
                console.log(result)
                if (result.state !== 'connected') {
                    setState({ status: 'connected' })
                }
            })
            .catch((reason) => setErrorMsg(`failed to get status: ${reason}`))

        // Listen for connected events from the provider
        const messageListener = (event: sdk.dappAPI.TxChangedEvent) => {
            setMessages((prev) => [JSON.stringify(event), ...prev])
        }
        const onAccountsChanged = (
            wallets: sdk.dappAPI.AccountsChangedEvent
        ) => {
            if (wallets.length > 0) {
                const primaryWallet = wallets.find((w) => w.primary)
                setState({
                    status: 'connected',
                    primaryParty: primaryWallet!.partyId,
                })
            } else {
                // TODO: throw error if no wallet?
            }
        }
        const onStatusChanged = (status: sdk.dappAPI.StatusEvent) => {
            console.log('Status changed event: ', status)
            // TODO: reconnect?
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
        if (!provider || state.status === 'connect') return
        console.log('requesting accounts...' + state.status)
        provider
            .request({
                method: 'requestAccounts',
            })
            .then((wallets) => {
                const requestedAccounts =
                    wallets as sdk.dappAPI.RequestAccountsResult
                if (requestedAccounts?.length > 0) {
                    const primaryWallet = requestedAccounts.find(
                        (w) => w.primary
                    )
                    if (primaryWallet) {
                        setState({
                            status: 'connected',
                            primaryParty: primaryWallet.partyId,
                        })
                    } else {
                        // TODO: Throw error
                    }
                } else {
                    // TODO: Throw error
                }
            })
            .catch((err) => {
                console.error('Error requesting wallets:', err)
                setErrorMsg(err instanceof Error ? err.message : String(err))
            })
    }, [state.status === 'connected' && state.primaryParty])

    // Third effect: load holdings
    useEffect(() => {
        const provider = window.canton
        if (!provider || state.status !== 'connected' || !state.primaryParty)
            return
        getHoldings(state.primaryParty).then((holdings) => {
            state.holdings = holdings
            console.log('got holdings')
            setState(state)
        })
    }, [state.status === 'connected' && state.primaryParty])

    return (
        <div>
            <h1>dApp Portfolio</h1>
            <div className="card">
                {state.status == 'connect' && (
                    <button
                        onClick={() => {
                            console.log('Connecting to Wallet Gateway...')
                            sdk.connect()
                                .then(({ status }) => {
                                    setState({ status: 'connecting' })
                                    setErrorMsg('')
                                    if (status.isConnected) {
                                        // TODO: err?
                                    }
                                })
                                .catch((err) => {
                                    console.log(err)
                                    setErrorMsg(err.details)
                                })
                        }}
                    >
                        connect to Wallet Gateway
                    </button>
                )}
                {state.status == 'connected' && (
                    <button
                        onClick={() => {
                            setState({ status: 'connecting' })
                            sdk.disconnect().then(() => {
                                setState({ status: 'connect' })
                            })
                        }}
                    >
                        disconnect
                    </button>
                )}
                <button
                    onClick={() => {
                        console.log('Opening to Wallet Gateway...')
                        sdk.open()
                    }}
                >
                    open Wallet Gateway
                </button>
                {errorMsg && (
                    <p className="error">
                        <b>Error:</b> <i>{errorMsg}</i>
                    </p>
                )}
                <br />
            </div>

            {state.status == 'connected' && (
                <ul>
                    {state.holdings?.map((h) => (
                        <li key={h.contractId}>
                            <AssetCard
                                name={h.name}
                                value={h.value}
                                symbol={h.symbol}
                            />
                        </li>
                    ))}
                </ul>
            )}

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
