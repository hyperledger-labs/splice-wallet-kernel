import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })
    const myParty = global.EXISTING_PARTY_1
    const token = await sdk.token(global.TOKEN_NAMESPACE_CONFIG)

    await token.holdings({ partyId: myParty })
}
