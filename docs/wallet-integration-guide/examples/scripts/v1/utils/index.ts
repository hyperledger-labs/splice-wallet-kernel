import { TokenProviderConfig } from '@canton-network/sdk'
import {
    AmuletConfig,
    AssetConfig,
    localNetStaticConfig,
    TokenConfig,
} from '@canton-network/sdk'

export function getActiveContractCid(entry: unknown) {
    if (!entry || typeof entry !== 'object' || !('JsActiveContract' in entry)) {
        return undefined
    }

    const activeContract = (entry as { JsActiveContract?: unknown })
        .JsActiveContract
    if (!activeContract || typeof activeContract !== 'object') {
        return undefined
    }

    const createdEvent = (activeContract as { createdEvent?: unknown })
        .createdEvent
    if (!createdEvent || typeof createdEvent !== 'object') {
        return undefined
    }

    const contractId = (createdEvent as { contractId?: unknown }).contractId
    return typeof contractId === 'string' ? contractId : undefined
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
