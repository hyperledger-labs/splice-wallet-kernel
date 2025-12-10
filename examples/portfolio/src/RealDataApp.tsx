// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react'
import './App.css'
import * as sdk from '@canton-network/dapp-sdk'
import { RegistriesProvider } from './contexts/RegistriesContext.js'
import { HoldingsTab } from './oldcomponents/HoldingsTab.js'
import { RegistriesTab } from './oldcomponents/RegistriesTab.js'
import { PendingTransfersTab } from './oldcomponents/PendingTransfersTab.js'
import { TwoStepTransferTab } from './oldcomponents/TwoStepTransferTab.js'
import { TransactionHistoryTab } from './oldcomponents/TransactionHistoryTab.js'
import { Tabs } from './oldcomponents/Tabs.js'

type Connection = {
    connected: boolean
    sessionToken?: string
    primaryParty?: string
}

function RealDataApp() {
    const [connection, setConnection] = useState<Connection>({
        connected: false,
    })

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
                setConnection({
                    ...connection,
                    connected: result.isConnected,
                    sessionToken: result.sessionToken,
                })
            })
            .catch((reason) => setErrorMsg(`failed to get status: ${reason}`))

        // Listen for connected events from the provider
        const onStatusChanged = (status: sdk.dappAPI.StatusEvent) => {
            console.log('Status changed event: ', status)
            setConnection({
                ...connection,
                connected: status.isConnected,
            })
            // TODO: reconnect if we got disconnected?
        }
        provider.on<sdk.dappAPI.StatusEvent>('statusChanged', onStatusChanged)
        return () => {
            provider.removeListener('statusChanged', onStatusChanged)
        }
    }, [])

    // Second effect: request accounts only when connected
    useEffect(() => {
        const provider = window.canton
        if (!provider || !connection.connected) return
        console.log('requesting accounts...')
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
                        setConnection({
                            ...connection,
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

        const messageListener = (event: sdk.dappAPI.TxChangedEvent) => {
            setMessages((prev) => [JSON.stringify(event), ...prev])
        }
        const onAccountsChanged = (
            wallets: sdk.dappAPI.AccountsChangedEvent
        ) => {
            let primaryWallet = undefined
            if (wallets.length > 0) {
                primaryWallet = wallets.find((w) => w.primary)
            }

            if (primaryWallet) {
                setConnection({
                    ...connection,
                    primaryParty: primaryWallet!.partyId,
                })
            } else {
                const noParty = { ...connection }
                delete noParty.primaryParty
                setConnection(noParty)
            }
        }
        provider.on<sdk.dappAPI.TxChangedEvent>('txChanged', messageListener)
        provider.on<sdk.dappAPI.AccountsChangedEvent>(
            'accountsChanged',
            onAccountsChanged
        )
        return () => {
            provider.removeListener('txChanged', messageListener)
            provider.removeListener('accountsChanged', onAccountsChanged)
        }
    }, [connection.connected])

    return (
        <RegistriesProvider>
            <h1>dApp Portfolio</h1>
            <div className="card">
                {!connection.connected && (
                    <button
                        onClick={() => {
                            console.log('Connecting to Wallet Gateway...')
                            sdk.connect()
                                .then((status) => {
                                    setConnection({
                                        connected: status.isConnected,
                                        sessionToken:
                                            status.session?.accessToken,
                                    })
                                    setErrorMsg('')
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
                {connection.connected && (
                    <button
                        onClick={() => {
                            sdk.disconnect().then(() => {
                                setConnection({ connected: false })
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

            {connection.connected && (
                <div>
                    Party: {connection.primaryParty}
                    <br />
                    SessionToken: {connection.sessionToken ? 'ok' : 'nope'}
                </div>
            )}

            <Tabs
                tabs={[
                    {
                        label: 'Holdings',
                        value: 'holdings',
                        content: connection.primaryParty ? (
                            <HoldingsTab
                                party={connection.primaryParty}
                                sessionToken={connection.sessionToken}
                            />
                        ) : (
                            <div>no party</div>
                        ),
                    },
                    {
                        label: 'Transfer',
                        value: 'twoStepTransfer',
                        content: connection.primaryParty ? (
                            <TwoStepTransferTab
                                party={connection.primaryParty}
                            />
                        ) : (
                            <div>no party</div>
                        ),
                    },
                    {
                        label: 'Pending Transfers',
                        value: 'pendingTransfers',
                        content: connection.primaryParty ? (
                            <PendingTransfersTab
                                party={connection.primaryParty}
                            />
                        ) : (
                            <div>no party</div>
                        ),
                    },
                    {
                        label: 'Transaction History',
                        value: 'transactionHistory',
                        content: connection.primaryParty ? (
                            <TransactionHistoryTab
                                party={connection.primaryParty}
                            />
                        ) : (
                            <div>no party</div>
                        ),
                    },
                    {
                        label: 'Registry Settings',
                        value: 'registries',
                        content: <RegistriesTab />,
                    },
                ]}
            />

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
        </RegistriesProvider>
    )
}

export default RealDataApp
