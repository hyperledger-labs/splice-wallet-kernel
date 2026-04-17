import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

export default async function () {
    // Create basic SDK first
    const basicSDK = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })

    // Extend with token namespace when needed
    const extendedSDK = await basicSDK.extend({
        token: global.TOKEN_NAMESPACE_CONFIG,
    })

    const partyId = EXISTING_PARTY_1

    // Now token namespace is available
    await extendedSDK.token.utxos.list({ partyId })
}
