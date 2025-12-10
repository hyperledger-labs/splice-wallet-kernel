// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createContext, useContext, useEffect, useState } from 'react'
import * as sdk from '@canton-network/dapp-sdk'

type Connection = {
    connected: boolean
    sessionToken?: string
    primaryParty?: string
    error?: string
}

const ConnectionContext = createContext<Connection>({ connected: false })

export const useConnection = () => useContext(ConnectionContext)

export const RegistriesProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [connection, setConnection] = useState<Connection>({
        connected: false,
    })

    // First effect: fetch status on mount
    useEffect(() => {
        const provider = window.canton
        if (!provider) return
        provider
            .request<sdk.dappAPI.StatusEvent>({ method: 'status' })
            .then((result) =>
                setConnection((c) => ({
                    ...c,
                    connected: result.isConnected,
                    sessionToken: result.sessionToken,
                }))
            )
            .catch((reason) =>
                setConnection((c) => ({
                    ...c,
                    error: `failed to get status: ${reason}`,
                }))
            )

        // Listen for connected events from the provider
        const onStatusChanged = (status: sdk.dappAPI.StatusEvent) => {
            setConnection({
                ...connection,
                connected: status.isConnected,
            })
            // TODO: reconnect if we got disconnected?
        }
        provider.on<sdk.dappAPI.StatusEvent>('statusChanged', onStatusChanged)
        return () => {
            provider.removeListener('statusChanged', onStatusChanged)
        }
    }, [])

    return (
        <ConnectionContext.Provider value={connection}>
            {children}
        </ConnectionContext.Provider>
    )
}
