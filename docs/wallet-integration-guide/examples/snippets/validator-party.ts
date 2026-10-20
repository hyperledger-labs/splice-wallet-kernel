import {
    SDK,
    getValidatorParty,
    localNetStaticConfig,
} from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = await SDK.create({
        auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
        synchronizerId: global.LOCALNET_GLOBAL_SYNCHRONIZER,
        token: {
            registries: [
                new URL('http://localhost:2000/api/validator/v0/scan-proxy'),
            ],
            auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        },
        amulet: {
            scanApiUrl: localNetStaticConfig.LOCALNET_SCAN_API_URL,
            auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
            registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
        },
    })

    const validatorParty = await getValidatorParty(
        localNetStaticConfig.LOCALNET_APP_VALIDATOR_URL,
        TOKEN_PROVIDER_CONFIG_DEFAULT
    )
}
