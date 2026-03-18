import { useState } from 'react'

import * as sdk from '@canton-network/dapp-sdk'
import { prettyjson } from '../utils'

export function LedgerQuery(props: {
    primaryParty?: string
    ledgerApiVersion?: string
    connectResult?: sdk.dappAPI.ConnectResult
}) {
    const [loading, setLoading] = useState(false)
    const [queryResponses, setQueryResponses] = useState<
        Array<{ timestamp: Date; data: object }>
    >([])

    const connected = props.connectResult?.isConnected ?? false

    return (
        connected && (
            <div className="card">
                <h2>Ledger Querying</h2>
                <button
                    disabled={!props.primaryParty}
                    onClick={() => {
                        setLoading(true)
                        const packageName = 'canton-builtin-admin-workflow-ping'
                        sdk.ledgerApi({
                            requestMethod: 'get',
                            resource: `/v2/interactive-submission/preferred-package-version`,
                            query: {
                                'package-name': packageName,
                                parties: props.primaryParty!,
                            },
                        }).then((response) => {
                            setQueryResponses((prev) => [
                                ...prev,
                                { timestamp: new Date(), data: response },
                            ])
                            setLoading(false)
                        })
                    }}
                >
                    query preferred package version
                </button>

                {loading && <p>Loading...</p>}

                {queryResponses.length > 0 && (
                    <div>
                        <p>Total queries: {queryResponses.length}</p>
                        <div className="terminal-display">
                            <pre>
                                {queryResponses.map((item, index) => (
                                    <div key={index} className="terminal-item">
                                        <div
                                            style={{
                                                color: '#0ff',
                                                marginBottom: '4px',
                                            }}
                                        >
                                            Query #
                                            {queryResponses.length - index} (
                                            {item.timestamp.toLocaleTimeString()}
                                            )
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
    )
}
