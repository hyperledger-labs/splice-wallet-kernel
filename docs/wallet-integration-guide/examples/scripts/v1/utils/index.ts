import { JSContractEntry } from '@canton-network/core-ledger-client'
import { TokenProviderConfig } from '@canton-network/wallet-sdk'

export function getActiveContractCid(entry: JSContractEntry) {
    if ('JsActiveContract' in entry) {
        return entry.JsActiveContract.createdEvent.contractId
    }
}

export const TOKEN_PROVIDER_CONFIG_DEFAULT: TokenProviderConfig = {
    method: 'self_signed',
    issuer: 'unsafe-auth',
    credentials: {
        clientId: 'ledger-api-user',
        clientSecret: 'unsafe',
        audience: 'https://canton.network.global',
        scope: '',
    },
}
