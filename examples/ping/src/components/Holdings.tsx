import * as sdk from '@canton-network/dapp-sdk'
import { useHoldings } from '../hooks/useHoldings'
import { useAccounts } from '../hooks/useAccounts'
export default function Holdings(props: {
    connectResult?: sdk.dappAPI.ConnectResult
}) {
    const holdings = useHoldings(props.connectResult)
    const accounts = useAccounts(props.connectResult)
    const connected = props.connectResult?.isConnected ?? false

    if (!connected) {
        return <div></div>
    }

    const providerAvailable = window.canton

    return (
        connected &&
        providerAvailable && (
            <div>
                <h2>Accounts</h2>
                <p>
                    Utxos for party:{' '}
                    {accounts?.find((p) => p.primary)!.partyId ?? ''}
                </p>
                <div className="terminal-display">
                    <div
                        className="terminal-item"
                        style={{ borderBottom: 'none' }}
                    >
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {holdings?.map((h) => (
                                <li
                                    key={h.contractId}
                                    style={{
                                        marginBottom: '8px',
                                        color: '#0ff',
                                    }}
                                >
                                    <i>{h.activeContract && ' (primary)'}</i>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        )
    )
}
