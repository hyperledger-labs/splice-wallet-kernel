import { JSContractEntry } from '@canton-network/core-ledger-client'
import { TokenProviderConfig } from '@canton-network/wallet-sdk'
import {
    AmuletConfig,
    AssetConfig,
    localNetStaticConfig,
    TokenConfig,
} from '@canton-network/sdk'

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
export const TOKEN_NAMESPACE_CONFIG: TokenConfig = {
    validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
}

export const AMULET_NAMESPACE_CONFIG: AmuletConfig = {
    validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    scanApiUrl: localNetStaticConfig.LOCALNET_SCAN_API_URL,
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
    registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
}

export const ASSET_CONFIG: AssetConfig = {
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
}
