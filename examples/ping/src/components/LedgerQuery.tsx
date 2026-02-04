import { useState } from 'react'

import * as sdk from '@canton-network/dapp-sdk'
import { prettyjson } from '../utils'

export function LedgerQuery(props: {
    primaryParty?: string
    ledgerApiVersion?: string
    status?: sdk.dappAPI.StatusEvent
}) {
    const [loading, setLoading] = useState(false)
    const [queryResponses, setQueryResponses] = useState<
        Array<{ timestamp: Date; data: object }>
    >([])

    const connected = props.status?.isConnected ?? false

    return (
        connected && (
            <div className="card" data-testid="ledger-query">
                <h2>Ledger Querying</h2>
                <button
                    disabled={!props.primaryParty}
                    onClick={() => {
                        setLoading(true)
                        const packageName = props.ledgerApiVersion?.startsWith(
                            '3.3.'
                        )
                            ? 'AdminWorkflows'
                            : 'canton-builtin-admin-workflow-ping'
                        const queryString = new URLSearchParams([
                            ['package-name', packageName],
                            ['parties', props.primaryParty!],
                        ]).toString()
                        sdk.ledgerApi({
                            requestMethod: 'GET',
                            resource: `/v2/interactive-submission/preferred-package-version?${queryString}`,
                        }).then((r) => {
                            const responseData = JSON.parse(r.response)
                            setQueryResponses((prev) => [
                                ...prev,
                                { timestamp: new Date(), data: responseData },
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
