import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

export default async function () {
    // it is important to configure the SDK correctly else you might run into connectivity or authentication issues
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })
    const key = sdk.keys.generate()

    // partyHint is optional but recommended to make it easier to identify the party
    const partyHint = 'my-wallet-1'

    const prepared = sdk.party.external.create(key.publicKey, {
        partyHint,
    })

    prepared.topology
}
