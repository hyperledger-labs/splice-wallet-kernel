import type { JSContractEntry } from '@canton-network/core-ledger-client'
import {
    type TokenProviderConfig,
    localNetStaticConfig,
    type TokenConfig,
    type AmuletConfig,
    type AssetConfig,
    type SynchronizerSelector,
} from '@canton-network/wallet-sdk'

export {
    logAllContracts,
    type ContractReadSpec as ContractSpec,
} from './acs-logger.js'
export function getActiveContractCid(entry: JSContractEntry) {
    if ('JsActiveContract' in entry) {
        return entry.JsActiveContract.createdEvent.contractId
    }
}

/** Maps the two synchronizer roles used in multi-synchronizer setups. */
export type KnownSynchronizers = {
    globalSynchronizerId: string
    appSynchronizerId: string
}

/**
 * `synchronizerId` selector for `SDK.create` that picks LocalNet's global
 * synchronizer. LocalNet can additionally run an app-synchronizer, and the SDK
 * refuses to guess between them — pass this when your code targets the global one.
 */
export const localNetGlobalSynchronizer: SynchronizerSelector = (
    synchronizers
) => {
    const global = synchronizers.find(
        (s) =>
            s.synchronizerAlias === 'global' ||
            s.synchronizerAlias === 'global-domain'
    )
    if (!global) {
        throw new Error(
            `No global synchronizer among: ${synchronizers
                .map((s) => s.synchronizerAlias)
                .join(', ')}`
        )
    }
    return global.synchronizerId
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
