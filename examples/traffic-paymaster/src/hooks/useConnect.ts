// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react'
import * as sdk from '@canton-network/dapp-sdk'

/** Connects to the wallet gateway and tracks the live connection/account state. */
export function useConnect() {
    const [connectResult, setConnectResult] =
        useState<sdk.dappAPI.ConnectResult>()
    const [accounts, setAccounts] = useState<sdk.dappAPI.Wallet[]>()
    const [sessionToken, setSessionToken] = useState<string>()

    const connected = connectResult?.isConnected ?? false

    async function connect() {
        const result = await sdk.connect()
        setConnectResult(result)
    }

    async function disconnect() {
        await sdk.disconnect().catch(() => undefined)
        setConnectResult(undefined)
        setAccounts(undefined)
        setSessionToken(undefined)
    }

    useEffect(() => {
        sdk.init()
            .then(() => sdk.status())
            .then((s) => {
                setConnectResult(s.connection)
                setSessionToken(s.session?.accessToken)
            })
            .catch(() => undefined)
    }, [])

    useEffect(() => {
        const onStatusChanged = (status: sdk.dappAPI.StatusEvent) => {
            setConnectResult(status.connection)
            setSessionToken(status.session?.accessToken)
        }
        sdk.onStatusChanged(onStatusChanged)
        return () => {
            void sdk.removeOnStatusChanged(onStatusChanged)
        }
    }, [])

    useEffect(() => {
        if (!connected) return
        sdk.listAccounts()
            .then(setAccounts)
            .catch(() => setAccounts(undefined))

        const onAccountsChanged = (event: sdk.dappAPI.AccountsChangedEvent) =>
            setAccounts(event as unknown as sdk.dappAPI.Wallet[])
        sdk.onAccountsChanged(onAccountsChanged)
        return () => {
            void sdk.removeOnAccountsChanged(onAccountsChanged)
            setAccounts(undefined)
        }
    }, [connected])

    const primaryParty = accounts?.find((account) => account.primary)
        ?.partyId

    return {
        connect,
        disconnect,
        connectResult,
        connected,
        accounts,
        primaryParty,
        sessionToken,
    }
}
