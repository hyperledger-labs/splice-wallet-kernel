// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef, useState } from 'react'
import { createDappClient } from '@canton-network/dapp-sdk'
import type {
    DappClient,
    StatusEvent,
    ConnectResult,
} from '@canton-network/dapp-sdk'

/**
 * React hook that manages connection via the new DappClient (wallet picker) API.
 * Mirrors the same connectResult shape as useConnect so App.tsx can use either.
 */
export function useClientConnect(): {
    init: () => Promise<void>
    connect: () => Promise<void>
    disconnect: () => Promise<void>
    connectResult?: ConnectResult
} {
    const clientRef = useRef<DappClient | null>(null)
    const [connectResult, setConnectResult] = useState<ConnectResult>()

    async function init() {
        if (clientRef.current) return

        const client = createDappClient({
            appName: 'Example dApp',
        })
        await client.init()
        clientRef.current = client
    }

    async function connect() {
        const client = clientRef.current
        if (!client) throw new Error('Client not initialized — call init() first')

        await client.connect()
        const provider = client.getProvider()

        const statusResult = await provider.request({ method: 'status' })
        setConnectResult(statusResult.connection)
    }

    async function disconnect() {
        const client = clientRef.current
        if (!client) return

        await client.disconnect()
        setConnectResult(undefined)
    }

    useEffect(() => {
        const client = clientRef.current
        if (!connectResult?.isConnected || !client) return

        let provider: ReturnType<DappClient['getProvider']>
        try {
            provider = client.getProvider()
        } catch {
            return
        }

        const onStatusChanged = (status: StatusEvent) => {
            console.debug('[useClientConnect] statusChanged:', status)
            setConnectResult(status.connection)
        }

        provider.on<StatusEvent>('statusChanged', onStatusChanged)

        return () => {
            provider.removeListener<StatusEvent>('statusChanged', onStatusChanged)
        }
    }, [connectResult])

    return {
        init,
        connect,
        disconnect,
        connectResult,
    }
}
