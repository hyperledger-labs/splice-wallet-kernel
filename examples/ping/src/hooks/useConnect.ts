// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react'
import * as sdk from '@canton-network/dapp-sdk'
import { handleErrorToast } from '@canton-network/core-wallet-ui-components'


/**
 * React hook that manages the connection to the wallet gateway.
 * Uses the dapp-sdk to connect and disconnect, and updates the connection status.
 *
 * @returns { connect, disconnect, status }
 */
export function useConnect(): {
    connect: () => Promise<void>
    disconnect: () => Promise<void>
    status?: sdk.dappAPI.StatusEvent
} {
    const [status, setStatus] = useState<sdk.dappAPI.StatusEvent>()

    async function connect() {
        sdk.connect()
            .then((status) => {
                setStatus(status)
            })
            .catch((err) => {
                console.error('Error connecting to wallet:', err)
                handleErrorToast(err)
                throw err
            })
    }

    async function disconnect() {
        sdk.disconnect().then(() => {
            setStatus(undefined)
        })
    }

    useEffect(() => {
        sdk.status()
            .then(setStatus)
            .catch(() => {
                setStatus(undefined)
            })
    }, [])

    useEffect(() => {
        if (status?.isConnected) {
            console.debug('[use-connect] Adding status changed listener')
            const onStatusChanged = (status: sdk.dappAPI.StatusEvent) => {
                console.debug(
                    '[use-connect] Received status changed event:',
                    status
                )
                setStatus(status)
            }

            sdk.onStatusChanged(onStatusChanged)

            return () => {
                console.debug('[use-connect] Removing status changed listener')
                sdk.removeOnStatusChanged(onStatusChanged)
            }
        }
    }, [status])

    return {
        connect,
        disconnect,
        status,
    }
}
