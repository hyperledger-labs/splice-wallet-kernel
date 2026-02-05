// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react'
import * as sdk from '@canton-network/dapp-sdk'

export function useTransactions(connectResult?: sdk.dappAPI.ConnectResult) {
    const [transactions, setTransactions] = useState<
        sdk.dappAPI.TxChangedEvent[]
    >([])

    useEffect(() => {
        if (connectResult?.isConnected) {
            const listener = (event: sdk.dappAPI.TxChangedEvent) => {
                setTransactions((prevTxs) => [event, ...prevTxs])
            }

            sdk.onTxChanged(listener)
            return () => {
                sdk.removeOnTxChanged(listener)
            }
        }
    }, [connectResult, setTransactions])

    return transactions
}
