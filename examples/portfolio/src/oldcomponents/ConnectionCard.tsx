// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useConnection } from '../contexts/ConnectionContext'
import { usePrimaryAccount } from '../hooks/useAccounts'

export const ConnectionCard: React.FC = () => {
    const { error, status, connect, open, disconnect } = useConnection()
    const connected = status?.isConnected
    const primaryParty = usePrimaryAccount()?.partyId

    return (
        <div className="card">
            {JSON.stringify(status)}
            {!connected && (
                <button onClick={() => connect()}>
                    connect to Wallet Gateway
                </button>
            )}
            {connected && (
                <button onClick={() => disconnect()}>disconnect</button>
            )}
            <button onClick={() => open()}>open Wallet Gateway</button>
            {error && (
                <p className="error">
                    <b>Error:</b> <i>{error}</i>
                </p>
            )}
            <br />

            {connected && (
                <div>
                    Party: {primaryParty}
                    <br />
                    SessionToken: {status?.session?.accessToken ? 'ok' : 'nope'}
                </div>
            )}
        </div>
    )
}
