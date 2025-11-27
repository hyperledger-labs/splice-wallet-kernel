// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { useEffect, useState } from 'react'
import './App.css'
import {
    TokenStandardClient,
    HOLDING_INTERFACE_ID,
} from '@canton-network/core-token-standard'
import * as sdk from '@canton-network/dapp-sdk'
import { AssetCard } from './components/AssetCard'
import { ScanProxyClient } from '@canton-network/core-splice-client'
import { pino } from 'pino'
import { v4 } from 'uuid'
import { createLedgerClient } from './utils/createLedgerClient.js'

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

    const ledgerClient = await createLedgerClient({})

    const ledgerEnd2 = await ledgerClient.get('/v2/state/ledger-end')
    console.log('ledgerEnd2', ledgerEnd2.offset)

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

export const createTapCommand = async (party: string, sessionToken: string) => {
    const logger = pino({ name: 'main', level: 'debug' })
    const tokenStandardClient = new TokenStandardClient(
        'http://scan.localhost:4000',
        logger,
        false // isAdmin
    )
    const scanProxyClient = new ScanProxyClient(
        new URL('http://localhost:2000/api/validator'),
        logger,
        false, // isAdmin
        sessionToken
    )
    const REQUESTED_AT_SKEW_MS = 60_000
    const registryInfo = await tokenStandardClient.get(
        '/registry/metadata/v1/info'
    )
    const instrumentAdmin = registryInfo.adminId
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const choiceArgs = {
        expectedAdmin: instrumentAdmin,
        transfer: {
            sender: instrumentAdmin,
            receiver: party,
            amount: 10000,
            instrumentId: { admin: instrumentAdmin, id: 'Amulet' },
            lock: null,
            requestedAt: new Date(
                Date.now() - REQUESTED_AT_SKEW_MS
            ).toISOString(),
            executeBefore: tomorrow.toISOString(),
            inputHoldingCids: [],
            meta: { values: {} },
        },
        extraArgs: {
            context: { values: {} },
            meta: { values: {} },
        },
    }
    const transferFactory = await tokenStandardClient.post(
        '/registry/transfer-instruction/v1/transfer-factory',
        {
            choiceArguments: choiceArgs as unknown as Record<string, never>,
        }
    )
    const disclosedContracts = transferFactory.choiceContext.disclosedContracts
    console.log('disclosedContracts', disclosedContracts)

    const amuletRules = await scanProxyClient.getAmuletRules()
    console.log('amuletRules', amuletRules)

    const latestOpenMiningRound =
        await scanProxyClient.getActiveOpenMiningRound()
    console.log('latestOpenMiningRound', latestOpenMiningRound)

    const tapCommand = {
        templateId: amuletRules.template_id!,
        contractId: amuletRules.contract_id,
        choice: 'AmuletRules_DevNet_Tap',
        choiceArgument: {
            receiver: choiceArgs.transfer.receiver,
            amount: choiceArgs.transfer.amount,
            openRound: latestOpenMiningRound!.contract_id,
        },
    }

    const request = {
        commands: [{ ExerciseCommand: tapCommand }],
        commandId: v4(),
        actAs: [party],
        disclosedContracts,
        // userId
        // synchronizerId
    }

    const ledgerClient = await createLedgerClient({})
    const response = await ledgerClient.postWithRetry(
        '/v2/commands/submit-and-wait',
        request
    )
    console.log(response)
}

type Connection = {
    connected: boolean
    sessionToken?: string
    primaryParty?: string
}

function App() {
    const [connection, setConnection] = useState<Connection>({
        connected: false,
    })
    const [holdings, setHoldings] = useState<Holding[] | undefined>(undefined)

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
        const onStatusChanged = (status: sdk.dappAPI.StatusEvent) => {
            console.log('Status changed event: ', status)
            setConnection({
                ...connection,
                connected: status.isConnected,
            })
            // TODO: reconnect if we got disconnected?
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
    }, [connection.connected])

    // Third effect: load holdings
    useEffect(() => {
        const provider = window.canton
        if (!provider || !connection.connected || !connection.primaryParty)
            return
        getHoldings(connection.primaryParty).then((holdings) => {
            console.log('got holdings')
            setHoldings(holdings)
        })
    }, [connection.primaryParty])

    return (
        <div>
            <h1>dApp Portfolio</h1>
            <div className="card">
                {!connection.connected && (
                    <button
                        onClick={() => {
                            console.log('Connecting to Wallet Gateway...')
                            sdk.connect()
                                .then(({ status, sessionToken }) => {
                                    setConnection({
                                        connected: status.isConnected,
                                        sessionToken,
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
                {connection.connected && (
                    <button
                        disabled={!connection.primaryParty}
                        onClick={() => {
                            createTapCommand(
                                connection.primaryParty!,
                                connection.sessionToken!
                            )
                        }}
                    >
                        TAP
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

            {holdings !== undefined && (
                <ul>
                    {holdings?.map((h) => (
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
