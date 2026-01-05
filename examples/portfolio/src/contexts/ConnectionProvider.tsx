// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react'
import * as sdk from '@canton-network/dapp-sdk'
import { type ConnectionStatus, ConnectionContext } from './ConnectionContext'

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
        connected: false,
    })

    const connect = () => {
        sdk.connect()
            .then((status) => {
                setConnectionStatus({
                    connected: status.isConnected,
                    sessionToken: status.session?.accessToken,
                    error: undefined,
                })
            })
            .catch((err) => {
                setConnectionStatus({ connected: false, error: err.details })
            })
    }

    const open = () => sdk.open()

    const disconnect = () => {
        sdk.disconnect().then(() =>
            setConnectionStatus({
                connected: false,
            })
        )
    }

    // First effect: fetch status on mount
    useEffect(() => {
        const provider = window.canton
        if (!provider) return
        provider
            .request<sdk.dappAPI.StatusEvent>({ method: 'status' })
            .then((result) =>
                setConnectionStatus((c) => ({
                    ...c,
                    connected: result.isConnected,
                    sessionToken: result.sessionToken,
                }))
            )
            .catch((reason) =>
                setConnectionStatus((c) => ({
                    ...c,
                    error: `failed to get status: ${reason}`,
                }))
            )

        // Listen for connected events from the provider
        const onStatusChanged = (status: sdk.dappAPI.StatusEvent) => {
            setConnectionStatus((c) => ({
                ...c,
                connected: status.isConnected,
            }))
            // TODO: reconnect if we got disconnected?
            // TODO: remove sessiontoken/primparty if we got disconnected?
        }
        provider.on<sdk.dappAPI.StatusEvent>('statusChanged', onStatusChanged)
        return () => {
            provider.removeListener('statusChanged', onStatusChanged)
        }
    }, [])

    // Second effect: request accounts only when connected
    useEffect(() => {
        const provider = window.canton
        if (!provider || !connectionStatus.connected) return
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
                        setConnectionStatus((c) => ({
                            ...c,
                            primaryParty: primaryWallet.partyId,
                        }))
                    } else {
                        // TODO: Throw error
                    }
                } else {
                    // TODO: Throw error
                }
            })
            .catch((err) => {
                console.error('Error requesting wallets:', err)
                const msg = err instanceof Error ? err.message : String(err)
                setConnectionStatus((c) => ({ ...c, error: msg }))
            })

        const messageListener = (event: sdk.dappAPI.TxChangedEvent) => {
            console.log('incoming event', event)
        }
        const onAccountsChanged = (
            wallets: sdk.dappAPI.AccountsChangedEvent
        ) => {
            let primaryWallet = undefined
            if (wallets.length > 0) {
                primaryWallet = wallets.find((w) => w.primary)
            }

            if (primaryWallet) {
                setConnectionStatus((c) => ({
                    ...c,
                    primaryParty: primaryWallet!.partyId,
                }))
            } else {
                setConnectionStatus((c) => {
                    const noParty = { ...c }
                    delete noParty.primaryParty
                    return noParty
                })
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
    }, [connectionStatus.connected])

    return (
        <ConnectionContext.Provider
            value={{ status: connectionStatus, connect, open, disconnect }}
        >
            {children}
        </ConnectionContext.Provider>
    )
}
