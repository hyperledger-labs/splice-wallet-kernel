// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import * as sdk from '@canton-network/dapp-sdk'
import { queryKeys } from '../hooks/query-keys'
import { ConnectionContext } from './ConnectionContext'

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const queryClient = useQueryClient()
    const [connectionStatus, setConnectionStatus] = useState<
        sdk.dappAPI.StatusEvent | undefined
    >()
    const [accounts, setAccounts] = useState<sdk.dappAPI.Wallet[]>([])
    const [error, setError] = useState<string | undefined>()

    const connect = useCallback(() => {
        sdk.connect()
            .then(() => sdk.status())
            .then((status) => {
                setConnectionStatus(status)
                setAccounts([])
            })
            .catch((err) => {
                setConnectionStatus(undefined)
                setError(err.details)
                setAccounts([])
            })
    }, [])

    const open = useCallback(() => sdk.open(), [])

    const disconnect = useCallback(() => {
        sdk.disconnect().then(() => {
            setConnectionStatus(undefined)
            setAccounts([])
            setError(undefined)
        })
    }, [])

    // First effect: fetch status on mount
    useEffect(() => {
        const provider = window.canton
        if (!provider) return
        provider
            .request({ method: 'status' })
            .then((status) => setConnectionStatus(status))
            .catch((reason) => setError(`failed to get status: ${reason}`))

        // Listen for connected events from the provider
        const onStatusChanged = (status: sdk.dappAPI.StatusEvent) =>
            setConnectionStatus(status)
        provider.on<sdk.dappAPI.StatusEvent>('statusChanged', onStatusChanged)
        return () => {
            provider.removeListener('statusChanged', onStatusChanged)
        }
    }, [])

    // Second effect: request accounts only when connected
    useEffect(() => {
        const provider = window.canton
        if (!provider || !connectionStatus?.isConnected) return
        provider
            .request({
                method: 'listAccounts',
            })
            .then((wallets) => {
                const requestedAccounts =
                    wallets as sdk.dappAPI.ListAccountsResult
                setAccounts(requestedAccounts)
            })
            .catch((err) => {
                console.error('Error requesting wallets:', err)
                const msg = err instanceof Error ? err.message : String(err)
                setError(msg)
            })

        const messageListener = async (event: sdk.dappAPI.TxChangedEvent) => {
            console.log('incoming event', event)
            if (event.status === 'executed') {
                await queryClient.invalidateQueries({
                    queryKey: queryKeys.listPendingTransfers.all,
                })
                await queryClient.invalidateQueries({
                    queryKey: queryKeys.getTransactionHistory.all,
                })
            }
        }
        const onAccountsChanged = (wallets: sdk.dappAPI.AccountsChangedEvent) =>
            setAccounts(wallets)
        provider.on<sdk.dappAPI.TxChangedEvent>('txChanged', messageListener)
        provider.on<sdk.dappAPI.AccountsChangedEvent>(
            'accountsChanged',
            onAccountsChanged
        )
        return () => {
            provider.removeListener('txChanged', messageListener)
            provider.removeListener('accountsChanged', onAccountsChanged)
        }
    }, [connectionStatus?.isConnected, queryClient])

    return (
        <ConnectionContext.Provider
            value={{
                status: connectionStatus,
                accounts,
                error,
                connect,
                open,
                disconnect,
            }}
        >
            {children}
        </ConnectionContext.Provider>
    )
}
