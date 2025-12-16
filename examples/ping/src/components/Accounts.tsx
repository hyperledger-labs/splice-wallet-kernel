import * as sdk from '@canton-network/dapp-sdk'
import { useAccounts } from '../hooks/useAccounts'

export function Accounts(props: { status?: sdk.dappAPI.StatusEvent }) {
    const accounts = useAccounts(props.status)
    const primaryParty = accounts?.find((ac) => ac.primary)

    const connected = props.status?.isConnected ?? false

    return (
        connected && (
            <div>
                <h2>Accounts</h2>
                <h4>⭐ Primary Party ⭐</h4>
                {primaryParty ? (
                    primaryParty.partyId
                ) : (
                    <i>No primary party found.</i>
                )}
                <h4>All Accounts</h4>
                <ul>
                    {accounts?.map((account) => (
                        <li key={account.partyId}>
                            <i>{account.partyId}</i>
                        </li>
                    ))}
                </ul>
            </div>
        )
    )
}
