import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

export default async function () {
    //Default configuration

    const sdk = await SDK.create({
        auth: {
            method: 'self_signed',
            issuer: 'unsafe-auth',
            credentials: {
                clientId: 'ledger-api-user',
                clientSecret: 'unsafe',
                audience: 'https://canton.network.global',
                scope: '',
            },
        },
        ledgerClientUrl: 'http://localhost:2975',
    })

    const myParty = global.EXISTING_PARTY_1

    //Optionally, can configure separate namespaces
    const token = await sdk.token({
        validatorUrl: 'http://localhost:2000/api/validator',
        registries: ['http://localhost:2000/api/validator/v0/scan-proxy'],
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
    })

    await token.utxos.list({ partyId: myParty })

    const amulet = await sdk.amulet({
        validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
        scanApiUrl: localNetStaticConfig.LOCALNET_SCAN_API_URL,
        auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
        registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
    })

    await amulet.traffic.status()

    const assets = await sdk.asset({
        registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
        auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
    })

    assets.list
}
