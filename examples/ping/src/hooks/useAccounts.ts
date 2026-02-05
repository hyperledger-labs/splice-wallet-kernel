// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useContext, useEffect, useState } from 'react'
import * as sdk from '@canton-network/dapp-sdk'
import { ErrorContext } from '../ErrorContext'

export function useAccounts(connectResult?: sdk.dappAPI.ConnectResult) {
    const [accounts, setAccounts] = useState<sdk.dappAPI.Wallet[]>()

    const { setErrorMsg } = useContext(ErrorContext)

    useEffect(() => {
        if (connectResult?.isConnected) {
            sdk.listAccounts()
                .then((accounts) => {
                    setAccounts(accounts)
                })
                .catch((err) => {
                    console.error('Error requesting wallets:', err)
                    setErrorMsg(
                        err instanceof Error ? err.message : String(err)
                    )
                })
        }
    }, [connectResult, setErrorMsg])

    useEffect(() => {
        if (connectResult?.isConnected) {
            const listener = (event: sdk.dappAPI.AccountsChangedEvent) => {
                console.log('[use-accounts] Accounts changed:', event)
                setAccounts(event)
            }

            sdk.onAccountsChanged(listener)

            return () => {
                sdk.removeOnAccountsChanged(listener)
            }
        }
    }, [connectResult, setAccounts])

    return accounts
}
