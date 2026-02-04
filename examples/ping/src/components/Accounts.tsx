import * as sdk from '@canton-network/dapp-sdk'
import { useAccounts } from '../hooks/useAccounts'

export function Accounts(props: { status?: sdk.dappAPI.StatusEvent }) {
    const accounts = useAccounts(props.status)

    const connected = props.status?.isConnected ?? false

    const getAccountColor = (account: sdk.dappAPI.Wallet) => {
        if (account.disabled) {
            return '#888' 
        }
        if (account.primary) {
            return '#0ff' 
        }
        return '#ff0'
    }

    const sortedAccounts = accounts?.slice().sort((a, b) => {
        if (a.primary && !b.primary) return -1
        if (!a.primary && b.primary) return 1
        
        if (a.disabled && !b.disabled) return 1
        if (!a.disabled && b.disabled) return -1
        
        return 0
    })

    return (
        connected && (
            <div>
                <h2>Accounts</h2>
                <p>Total accounts: {sortedAccounts?.length ?? 0}</p>
                <div className="terminal-display">
                    <div className="terminal-item" style={{ borderBottom: 'none' }}>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {sortedAccounts?.map((account) => (
                                <li
                                    key={account.partyId}
                                    style={{
                                        marginBottom: '8px',
                                        color: getAccountColor(account),
                                    }}
                                >
                                    <i>
                                        {account.partyId}
                                        {account.primary && ' (primary)'}
                                        {account.disabled && ' (disabled)'}
                                    </i>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        )
    )
}
