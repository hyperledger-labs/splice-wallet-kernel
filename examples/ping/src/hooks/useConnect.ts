// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react'
import * as sdk from '@canton-network/dapp-sdk'
import { handleErrorToast } from '@canton-network/core-wallet-ui-components'
import { LoopAdapter } from '@canton-network/core-wallet-discovery-loop'

const loopAdapter = new LoopAdapter({
    name: '5N Loop Wallet',
    rpcUrl: 'https://devnet.cantonloop.com',
})

/**
 * React hook that manages the connection to the wallet gateway.
 * Uses the dapp-sdk to connect and disconnect, and updates the connection status.
 *
 * @returns { connect, disconnect, connectResult }
 */
export function useConnect(): {
    connect: () => Promise<void>
    disconnect: () => Promise<void>
    connectResult?: sdk.dappAPI.ConnectResult
} {
    const [connectResult, setConnectResult] =
        useState<sdk.dappAPI.ConnectResult>()

    async function connect() {
        await sdk
            .connect({ additionalAdapters: [loopAdapter] })
            .then(setConnectResult)
            .catch((err) => {
                console.error('Error connecting to wallet:', err)
                handleErrorToast(err)
                throw err
            })
    }

    async function disconnect() {
        await sdk.disconnect()
        setConnectResult(undefined)
    }

    useEffect(() => {
        sdk.status()
            .then((status) => setConnectResult(status.connection))
            .catch(() => {
                setConnectResult(undefined)
            })
    }, [])

    useEffect(() => {
        if (connectResult?.isConnected) {
            console.debug('[use-connect] Adding status changed listener')
            const onStatusChanged = (status: sdk.dappAPI.StatusEvent) => {
                console.debug(
                    '[use-connect] Received status changed event:',
                    status
                )
                setConnectResult(status.connection)
            }

            sdk.onStatusChanged(onStatusChanged)

            return () => {
                console.debug('[use-connect] Removing connect changed listener')
                sdk.removeOnStatusChanged(onStatusChanged)
            }
        }
    }, [connectResult])

    return {
        connect,
        disconnect,
        connectResult,
    }
}
