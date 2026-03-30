import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

export default async function () {
    // it is important to configure the SDK correctly else you might run into connectivity or authentication issues
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })

    const token = await sdk.token(global.TOKEN_NAMESPACE_CONFIG)

    const myParty = global.EXISTING_PARTY_1

    await token.utxos.list({ partyId: myParty })
}
