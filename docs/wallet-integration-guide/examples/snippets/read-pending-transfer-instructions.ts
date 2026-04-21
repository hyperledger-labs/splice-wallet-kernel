import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
        token: global.TOKEN_NAMESPACE_CONFIG,
    })
    const myParty = global.EXISTING_PARTY_1

    //this returns a list of all transfer instructions, you can then accept or reject them
    await sdk.token.transfer.pending(myParty)
}
