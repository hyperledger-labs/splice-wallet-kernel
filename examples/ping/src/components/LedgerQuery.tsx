import { useState } from 'react'

import * as sdk from '@canton-network/dapp-sdk'
import { prettyjson } from '../utils'

export function LedgerQuery(props: {
    primaryParty?: string
    ledgerApiVersion?: string
    status?: sdk.dappAPI.StatusEvent
}) {
    const [loading, setLoading] = useState(false)
    const [queryResponse, setQueryResponse] = useState<object>()

    const connected = props.status?.isConnected ?? false

    return (
        connected && (
            <div className="card">
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
                            setQueryResponse(JSON.parse(r.response))
                            setLoading(false)
                        })
                    }}
                >
                    query preferred package version
                </button>
                {queryResponse && (
                    <pre style={{ textAlign: 'left' }}>
                        <p>{prettyjson(queryResponse)}</p>
                    </pre>
                )}

                {loading && <p>Loading...</p>}
            </div>
        )
    )
}
