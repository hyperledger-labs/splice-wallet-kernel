// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react'
import * as sdk from '@canton-network/dapp-sdk'

/**
 * React hook that manages the connection to the wallet gateway.
 * Uses the dapp-sdk to connect and disconnect, and updates the connection status.
 *
 * @returns { status, statusEvent }
 */
export function useStatus(): {
    status: () => Promise<void>
    statusEvent?: sdk.dappAPI.StatusEvent
} {
    const [statusEvent, setStatusEvent] = useState<sdk.dappAPI.StatusEvent>()

    async function status() {
        await sdk
            .status()
            .then(setStatusEvent)
            .catch(() => {
                setStatusEvent(undefined)
            })
    }

    useEffect(() => {
        status()
    }, [])

    useEffect(() => {
        if (statusEvent?.connection.isConnected) {
            console.debug('[use-status] Adding status changed listener')
            const onStatusChanged = (status: sdk.dappAPI.StatusEvent) => {
                console.debug(
                    '[use-status] Received status changed event:',
                    status
                )
                setStatusEvent(status)
            }

            sdk.onStatusChanged(onStatusChanged)

            return () => {
                console.debug('[use-status] Removing status changed listener')
                sdk.removeOnStatusChanged(onStatusChanged)
            }
        }
    }, [statusEvent])

    return {
        status,
        statusEvent,
    }
}
