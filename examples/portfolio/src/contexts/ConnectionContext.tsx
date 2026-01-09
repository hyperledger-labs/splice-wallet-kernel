// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createContext, useContext } from 'react'
import * as sdk from '@canton-network/dapp-sdk'

export type ConnectionStatus = {
    connected: boolean
    sessionToken?: string
    primaryParty?: string
    accounts: sdk.dappAPI.Wallet[]
    error?: string
}

type Connection = {
    status: ConnectionStatus
    connect: () => void
    open: () => void
    disconnect: () => void
}

export const ConnectionContext = createContext<Connection | undefined>(
    undefined
)

export const useConnection = () => {
    const ctx = useContext(ConnectionContext)
    if (!ctx)
        throw new Error('useConnection must be used within ConnectionContext')
    return ctx
}
