import type { JSContractEntry } from '@canton-network/core-ledger-client'
import {
    type TokenProviderConfig,
    localNetStaticConfig,
    type TokenConfig,
    type AmuletConfig,
    type AssetConfig,
} from '@canton-network/wallet-sdk'

export {
    logAllContracts,
    type ContractReadSpec as ContractSpec,
} from './acs-logger.js'

// Shared, LocalNet-only helpers. They live in the private `core-wallet-test-utils`
// package so they never leak into the published SDK.
export {
    localNetGlobalSynchronizer,
    synchronizerByAlias,
    type KnownSynchronizers,
} from '@canton-network/core-wallet-test-utils/localnet'

export function getActiveContractCid(entry: JSContractEntry) {
    if ('JsActiveContract' in entry) {
        return entry.JsActiveContract.createdEvent.contractId
    }
}

export const TOKEN_PROVIDER_CONFIG_DEFAULT: TokenProviderConfig = {
    method: 'self_signed',
    issuer: 'unsafe-auth',
    credentials: {
        clientId: localNetStaticConfig.LOCALNET_USER_ID,
        clientSecret: 'unsafe',
        audience: 'https://canton.network.global',
        scope: '',
    },
}
export const TOKEN_NAMESPACE_CONFIG: TokenConfig = {
    validatorUrl: localNetStaticConfig.LOCALNET_APP_VALIDATOR_URL,
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
}

export const TOKEN_NAMESPACE_CONFIG_SIMPLE: TokenConfig = {
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
}

export const AMULET_NAMESPACE_CONFIG: AmuletConfig = {
    validatorUrl: localNetStaticConfig.LOCALNET_APP_VALIDATOR_URL,
    scanApiUrl: localNetStaticConfig.LOCALNET_SCAN_API_URL,
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
    registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
}

export const AMULET_NAMESPACE_CONFIG_SIMPLE: AmuletConfig = {
    scanApiUrl: localNetStaticConfig.LOCALNET_SCAN_API_URL,
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
    registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
}

export const ASSET_CONFIG: AssetConfig = {
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
}
