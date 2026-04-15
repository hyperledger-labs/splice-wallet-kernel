import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

export default async function () {
    // it is important to configure the SDK correctly else you might run into connectivity or authentication issues
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })
    const key = sdk.keys.generate()

    const party = await sdk.party.external
        .create(key.publicKey, { partyHint: 'my-party-without-rights' })
        .sign(key.privateKey)
        .execute({ grantUserRights: false }) //do not grant user actAs and readAs for the party
}
