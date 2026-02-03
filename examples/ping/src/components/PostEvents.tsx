// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useAllEvents } from '../hooks/useAllEvents'
import { prettyjson } from '../utils'
import * as sdk from '@canton-network/dapp-sdk'

export function PostEvents(props: {
    status?: sdk.dappAPI.StatusEvent
}) {
    const events = useAllEvents(props.status)
    const providerAvailable = window.canton

    const getEventColor = (type: string) => {
        switch (type) {
            case 'TxChanged':
                return '#0ff'
            case 'StatusChanged':
                return '#f0f'
            case 'AccountsChanged':
                return '#ff0'
            default:
                return '#fff'
        }
    }

    return (
        providerAvailable && (
            <div data-testid="post-events">
                <h2>Post Events</h2>
                {events.length === 0 ? (
                    <i>No post events received yet.</i>
                ) : (
                    <div>
                        <p>Total events received: {events.length}</p>
                        <div
                            style={{
                                marginTop: '16px',
                                width: '100%',
                                maxHeight: '400px',
                                overflow: 'auto',
                                backgroundColor: '#000',
                                color: '#0f0',
                                padding: '12px',
                                borderRadius: '4px',
                            }}
                        >
                            <pre style={{ textAlign: 'left', margin: 0 }}>
                                {events.map((item, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            marginBottom: '16px',
                                            borderBottom:
                                                index < events.length - 1
                                                    ? '1px solid #0a0'
                                                    : 'none',
                                            paddingBottom: '16px',
                                        }}
                                    >
                                        <div
                                            style={{
                                                color: getEventColor(item.type),
                                                marginBottom: '4px',
                                            }}
                                        >
                                            Event #{events.length - index} -{' '}
                                            {item.type} (
                                            {item.timestamp.toLocaleTimeString()}
                                            )
                                        </div>
                                        {prettyjson(item.event)}
                                    </div>
                                ))}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        )
    )
}
