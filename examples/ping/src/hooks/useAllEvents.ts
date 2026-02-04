// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef, useState } from 'react'
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

export function useAllEvents(status?: sdk.dappAPI.StatusEvent) {
    const [events, setEvents] = useState<AllEvents[]>([])
    const isListening = useRef<boolean>(false)

    useEffect(() => {
        if (isListening.current) return
        //we use window.canton here since we want to capture the initial login event as well
        if (status?.isConnected && window.canton) {
            isListening.current = true
            const txListener = (event: sdk.dappAPI.TxChangedEvent) => {
                console.debug('[use-all-events] Adding tx changed listener')
                setEvents((prev) => [
                    { type: 'TxChanged', event, timestamp: new Date() },
                    ...prev,
                ])
            }

            const statusListener = (event: sdk.dappAPI.StatusEvent) => {
                console.debug('[use-all-events] Adding status changed listener')
                setEvents((prev) => [
                    { type: 'StatusChanged', event, timestamp: new Date() },
                    ...prev,
                ])
            }

            const accountsListener = (
                event: sdk.dappAPI.AccountsChangedEvent
            ) => {
                console.debug(
                    '[use-all-events] Adding accounts changed listener'
                )
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
    }, [status?.isConnected])

    return events
}
