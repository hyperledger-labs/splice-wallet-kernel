import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
        amulet: global.AMULET_NAMESPACE_CONFIG,
    })

    const myParty = global.EXISTING_PARTY_1

    await sdk.amulet.tap(myParty, '2000')
}
