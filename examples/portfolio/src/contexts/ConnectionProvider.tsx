// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type QueryClient, useQueryClient } from '@tanstack/react-query'
import * as sdk from '@canton-network/dapp-sdk'
import { WalletConnectAdapter } from '@canton-network/dapp-sdk'
import { queryKeys } from '../hooks/query-keys'
import { ConnectionContext } from './ConnectionContext'

const wcProjectId = import.meta.env.VITE_WC_PROJECT_ID as string
const wcAdapter = wcProjectId
    ? WalletConnectAdapter.create({ projectId: wcProjectId })
    : undefined
const additionalAdapters = wcAdapter ? [wcAdapter] : []

type PublishConnectedStatus = (
    status: sdk.dappAPI.StatusEvent,
    connectionBoundary: boolean
) => void

const useConnectionInitialization = ({
    publishConnectedStatus,
    setError,
    setInitialized,
}: {
    publishConnectedStatus: PublishConnectedStatus
    setError: (error: string | undefined) => void
    setInitialized: (initialized: boolean) => void
}) => {
    useEffect(() => {
        let active = true

        sdk.init({ additionalAdapters })
            .then(() => sdk.status())
            .then((status) => {
                if (active) {
                    publishConnectedStatus(status, true)
                }
            })
            .catch((reason) => {
                const message =
                    reason instanceof Error ? reason.message : String(reason)

                if (message.includes('Not connected')) {
                    return
                }

                if (active) {
                    setError(`failed to get status: ${message}`)
                }
            })
            .finally(() => {
                if (active) {
                    setInitialized(true)
                }
            })

        return () => {
            active = false
        }
    }, [publishConnectedStatus, setError, setInitialized])
}

const useStatusChangeSubscription = ({
    isConnected,
    doDisconnect,
    publishConnectedStatus,
}: {
    isConnected: boolean | undefined
    doDisconnect: () => void
    publishConnectedStatus: PublishConnectedStatus
}) => {
    useEffect(() => {
        if (!isConnected) return

        const onStatusChanged = (status: sdk.dappAPI.StatusEvent) => {
            if (!status.connection?.isConnected) {
                doDisconnect()
                return
            }
            publishConnectedStatus(status, false)
        }

        void sdk.onStatusChanged(onStatusChanged)

        return () => {
            void sdk.removeOnStatusChanged(onStatusChanged)
        }
    }, [isConnected, doDisconnect, publishConnectedStatus])
}

const useConnectedProviderSubscriptions = ({
    isConnected,
    queryClient,
    setAccounts,
    setError,
}: {
    isConnected: boolean | undefined
    queryClient: QueryClient
    setAccounts: (accounts: sdk.dappAPI.Wallet[]) => void
    setError: (error: string | undefined) => void
}) => {
    useEffect(() => {
        const provider = sdk.getConnectedProvider()
        if (!provider || !isConnected) return

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
            if (event.status === 'executed') {
                await queryClient.invalidateQueries({
                    queryKey: queryKeys.walletConnection.pendingTransfers.all,
                })
                await queryClient.invalidateQueries({
                    queryKey: queryKeys.walletConnection.holdings.all,
                })
                await queryClient.invalidateQueries({
                    queryKey: queryKeys.walletConnection.transactionHistory.all,
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
    }, [isConnected, queryClient, setAccounts, setError])
}

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const queryClient = useQueryClient()
    const [initialized, setInitialized] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState<
        sdk.dappAPI.StatusEvent | undefined
    >()
    const [accounts, setAccounts] = useState<sdk.dappAPI.Wallet[]>([])
    const [error, setError] = useState<string | undefined>()
    const [sessionTokenVersion, setSessionTokenVersion] = useState(0)
    const currentSessionToken = useRef<string | undefined>(undefined)

    const clearWalletConnectionQueries = useCallback(() => {
        queryClient.removeQueries({
            queryKey: queryKeys.walletConnection.all,
        })
    }, [queryClient])

    const updateSessionToken = useCallback(
        (status: sdk.dappAPI.StatusEvent) => {
            const nextToken = status.session?.accessToken
            if (nextToken && nextToken !== currentSessionToken.current) {
                currentSessionToken.current = nextToken
                setSessionTokenVersion((version) => version + 1)
            }
        },
        []
    )

    const publishConnectedStatus = useCallback(
        (status: sdk.dappAPI.StatusEvent, connectionBoundary: boolean) => {
            if (connectionBoundary) {
                clearWalletConnectionQueries()
                currentSessionToken.current = undefined
                setAccounts([])
            }
            updateSessionToken(status)
            setConnectionStatus(status)
            setError(undefined)
        },
        [clearWalletConnectionQueries, updateSessionToken]
    )

    const connect = useCallback(() => {
        sdk.connect()
            .then(() => sdk.status())
            .then((status) => publishConnectedStatus(status, true))
            .catch((err: unknown) => {
                clearWalletConnectionQueries()
                currentSessionToken.current = undefined
                setConnectionStatus(undefined)
                setError(err instanceof Error ? err.message : String(err))
                setAccounts([])
            })
    }, [clearWalletConnectionQueries, publishConnectedStatus])

    const open = useCallback(() => sdk.open(), [])

    const doDisconnect = useCallback(() => {
        clearWalletConnectionQueries()
        currentSessionToken.current = undefined
        setConnectionStatus(undefined)
        setAccounts([])
        setError(undefined)
        sdk.disconnect().catch(() => {})
    }, [clearWalletConnectionQueries])

    const disconnect = useCallback(() => {
        doDisconnect()
    }, [doDisconnect])

    const isConnected = connectionStatus?.connection?.isConnected

    useConnectionInitialization({
        publishConnectedStatus,
        setError,
        setInitialized,
    })
    useStatusChangeSubscription({
        isConnected,
        doDisconnect,
        publishConnectedStatus,
    })
    useConnectedProviderSubscriptions({
        isConnected,
        queryClient,
        setAccounts,
        setError,
    })

    const contextValue = useMemo(
        () => ({
            initialized,
            status: connectionStatus,
            accounts,
            error,
            sessionTokenVersion,
            connect,
            open,
            disconnect,
        }),
        [
            initialized,
            connectionStatus,
            accounts,
            error,
            sessionTokenVersion,
            connect,
            open,
            disconnect,
        ]
    )

    return (
        <ConnectionContext.Provider value={contextValue}>
            {children}
        </ConnectionContext.Provider>
    )
}
