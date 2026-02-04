// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react'
import * as sdk from '@canton-network/dapp-sdk'

export type AllEvents =
    | { type: 'TxChanged'; event: sdk.dappAPI.TxChangedEvent; timestamp: Date }
    | {
          type: 'StatusChanged'
          event: sdk.dappAPI.StatusEvent
          timestamp: Date
      }
    | {
          type: 'AccountsChanged'
          event: sdk.dappAPI.AccountsChangedEvent
          timestamp: Date
      }

export function useAllEvents(connectResult?: sdk.dappAPI.ConnectResult) {
    const [events, setEvents] = useState<AllEvents[]>([])

    useEffect(() => {
        if (connectResult?.isConnected) {
            const txListener = (event: sdk.dappAPI.TxChangedEvent) => {
                setEvents((prev) => [
                    { type: 'TxChanged', event, timestamp: new Date() },
                    ...prev,
                ])
            }

            const statusListener = (event: sdk.dappAPI.StatusEvent) => {
                setEvents((prev) => [
                    { type: 'StatusChanged', event, timestamp: new Date() },
                    ...prev,
                ])
            }

            const accountsListener = (
                event: sdk.dappAPI.AccountsChangedEvent
            ) => {
                setEvents((prev) => [
                    { type: 'AccountsChanged', event, timestamp: new Date() },
                    ...prev,
                ])
            }

            sdk.onTxChanged(txListener)
            sdk.onStatusChanged(statusListener)
            sdk.onAccountsChanged(accountsListener)

            return () => {
                sdk.removeOnTxChanged(txListener)
                sdk.removeOnStatusChanged(statusListener)
                sdk.removeOnAccountsChanged(accountsListener)
            }
        }
    }, [connectResult])

    return events
}
