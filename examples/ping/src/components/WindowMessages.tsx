// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useWindowMessages } from '../hooks/useWindowMessages'
import { prettyjson } from '../utils'
import { WalletEvent } from '@canton-network/core-types'

export function WindowMessages() {
    const messages = useWindowMessages()

    const getMessageColor = (type: string) => {
        switch (type) {
            case WalletEvent.SPLICE_WALLET_LOGOUT:
                return '#f80'
            case WalletEvent.SPLICE_WALLET_IDP_AUTH_SUCCESS:
                return '#0f0'
            case WalletEvent.SPLICE_WALLET_REQUEST:
                return '#0ff'
            case WalletEvent.SPLICE_WALLET_RESPONSE:
                return '#f0f'
            case WalletEvent.SPLICE_WALLET_EXT_READY:
                return '#ff0'
            case WalletEvent.SPLICE_WALLET_EXT_ACK:
                return '#0f8'
            case WalletEvent.SPLICE_WALLET_EXT_OPEN:
                return '#f08'
            default:
                return '#888'
        }
    }

    return (
        <div data-testid="window-messages">
            <h2>Window Messages (postMessage)</h2>
            {messages.length === 0 ? (
                <i>No window messages received yet.</i>
            ) : (
                <div>
                    <p>Total messages received: {messages.length}</p>
                    <div className="terminal-display">
                        <pre>
                            {messages.map((item, index) => (
                                <div key={index} className="terminal-item">
                                    <div
                                        style={{
                                            color: getMessageColor(item.type),
                                            marginBottom: '4px',
                                        }}
                                    >
                                        Message #{messages.length - index} -{' '}
                                        {item.type} (
                                        {item.timestamp.toLocaleTimeString()})
                                    </div>
                                    <div
                                        style={{
                                            color: '#888',
                                            fontSize: '0.85em',
                                            marginBottom: '4px',
                                        }}
                                    >
                                        Origin: {item.origin}
                                    </div>
                                    {prettyjson(item.data)}
                                </div>
                            ))}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    )
}
