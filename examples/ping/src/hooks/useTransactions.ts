// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react'
import * as sdk from '@canton-network/dapp-sdk'

export function useTransactions(status?: sdk.dappAPI.StatusEvent) {
    const [transactions, setTransactions] = useState<
        sdk.dappAPI.TxChangedEvent[]
    >([])

    useEffect(() => {
        if (status?.isConnected) {
            const listener = (event: sdk.dappAPI.TxChangedEvent) => {
                setTransactions((prevTxs) => [event, ...prevTxs])
            }

            sdk.onTxChanged(listener)
            return () => {
                sdk.removeOnTxChanged(listener)
            }
        }
    }, [status, setTransactions])

    return transactions
}
