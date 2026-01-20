// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react'
import * as sdk from '@canton-network/dapp-sdk'
import { useConnection } from '../contexts/ConnectionContext'

export const useAccounts = (): sdk.dappAPI.Wallet[] => useConnection().accounts

export const usePrimaryAccount = (): sdk.dappAPI.Wallet | null => {
    const accounts = useAccounts()
    return useMemo(() => accounts.find((a) => a.primary) ?? null, [accounts])
}
