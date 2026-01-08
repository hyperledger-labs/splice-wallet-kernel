// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useConnection } from '../contexts/ConnectionContext'

export const ConnectionCard: React.FC = () => {
    const { status, connect, open, disconnect } = useConnection()
    const { error, connected, primaryParty, sessionToken } = status

    return (
        <div className="card">
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
                    SessionToken: {sessionToken ? 'ok' : 'nope'}
                </div>
            )}
        </div>
    )
}
