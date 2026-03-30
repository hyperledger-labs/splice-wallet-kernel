// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useContext, useEffect, useState } from 'react'
import * as sdk from '@canton-network/dapp-sdk'
import { ErrorContext } from '../ErrorContext'

/** Wallets sometimes emit a single {@link sdk.dappAPI.Wallet} instead of {@link sdk.dappAPI.Wallet[]}. */
function normalizeWalletList(value: unknown): sdk.dappAPI.Wallet[] {
    if (Array.isArray(value)) {
        return value as sdk.dappAPI.Wallet[]
    }
    if (
        value !== null &&
        typeof value === 'object' &&
        typeof (value as { partyId?: unknown }).partyId === 'string'
    ) {
        return [value as sdk.dappAPI.Wallet]
    }
    return []
}

export function useAccounts(connectResult?: sdk.dappAPI.ConnectResult) {
    const connected = connectResult?.isConnected ?? false
    const [accounts, setAccounts] = useState<sdk.dappAPI.Wallet[]>()
    const [prevConnected, setPrevConnected] = useState(connected)

    if (connected !== prevConnected) {
        setPrevConnected(connected)
        if (!connected) {
            setAccounts(undefined)
        }
    }

    const { setErrorMsg } = useContext(ErrorContext)

    useEffect(() => {
        if (!connected) {
            return
        }
        sdk.listAccounts()
            .then((raw) => {
                setAccounts(normalizeWalletList(raw))
            })
            .catch((err) => {
                console.error('Error requesting wallets:', err)
                setErrorMsg(err instanceof Error ? err.message : String(err))
            })
    }, [connected, connectResult, setErrorMsg])

    useEffect(() => {
        if (connectResult?.isConnected) {
            const listener = (event: sdk.dappAPI.AccountsChangedEvent) => {
                console.log('[use-accounts] Accounts changed:', event)
                setAccounts(normalizeWalletList(event as unknown))
            }

            sdk.onAccountsChanged(listener)

            return () => {
                sdk.removeOnAccountsChanged(listener)
            }
        }
    }, [connectResult])

    return accounts
}
