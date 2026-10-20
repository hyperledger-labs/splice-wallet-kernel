import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
        synchronizerId: global.LOCALNET_GLOBAL_SYNCHRONIZER,
        token: global.TOKEN_NAMESPACE_CONFIG,
    })

    const partyId = EXISTING_PARTY_1

    // token namespace is now available
    await sdk.token.utxos.list({ partyId })
}
