// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react'
import * as sdk from '@canton-network/dapp-sdk'

export function useAccounts(status?: sdk.dappAPI.StatusEvent) {
    const [accounts, setAccounts] = useState<sdk.dappAPI.Wallet[]>()

    useEffect(() => {
        if (status?.isConnected) {
            const listener = (event: sdk.dappAPI.AccountsChangedEvent) => {
                console.log('[use-accounts] Accounts changed:', event)
                setAccounts(event)
            }

            sdk.onAccountsChanged(listener)

            return () => {
                sdk.removeOnAccountsChanged(listener)
            }
        }
    }, [status, setAccounts])

    return accounts
}
