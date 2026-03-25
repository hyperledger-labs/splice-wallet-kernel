import { TokenProviderConfig } from '@canton-network/wallet-sdk'

export function getActiveContractCid(entry: unknown) {
    if (entry && typeof entry === 'object' && 'JsActiveContract' in entry) {
        const active = (
            entry as {
                JsActiveContract?: {
                    createdEvent?: {
                        contractId?: string
                    }
                }
            }
        ).JsActiveContract
        return active?.createdEvent?.contractId
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
