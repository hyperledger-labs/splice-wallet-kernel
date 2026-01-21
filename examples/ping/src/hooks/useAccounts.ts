// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useContext, useEffect, useState } from 'react'
import * as sdk from '@canton-network/dapp-sdk'
import { ErrorContext } from '../ErrorContext'

export function useAccounts(status?: sdk.dappAPI.StatusEvent) {
    const [accounts, setAccounts] = useState<sdk.dappAPI.Wallet[]>()

    const { setErrorMsg } = useContext(ErrorContext)

    const currentNetworkId = status?.network?.networkId

    useEffect(() => {
        if (status?.isConnected) {
            sdk.requestAccounts()
                .then((wallets) => {
                    const filteredWallets = currentNetworkId
                        ? wallets.filter(
                              (wallet) => wallet.networkId === currentNetworkId
                          )
                        : wallets
                    setAccounts(filteredWallets)
                })
                .catch((err) => {
                    console.error('Error requesting wallets:', err)
                    setErrorMsg(
                        err instanceof Error ? err.message : String(err)
                    )
                })
        }
    }, [status, currentNetworkId, setErrorMsg])

    useEffect(() => {
        if (status?.isConnected) {
            const listener = (event: sdk.dappAPI.AccountsChangedEvent) => {
                console.log('[use-accounts] Accounts changed:', event)
                const filteredWallets = currentNetworkId
                    ? event.filter(
                          (wallet) => wallet.networkId === currentNetworkId
                      )
                    : event
                setAccounts(filteredWallets)
            }

            sdk.onAccountsChanged(listener)

            return () => {
                sdk.removeOnAccountsChanged(listener)
            }
        }
    }, [status, currentNetworkId, setAccounts])

    return accounts
}
