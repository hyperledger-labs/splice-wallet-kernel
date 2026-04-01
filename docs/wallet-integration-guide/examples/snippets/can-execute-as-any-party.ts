import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

export default async function () {
    // it is important to configure the SDK correctly else you might run into connectivity or authentication issues
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })

    //optional arguments are idp and userId; if not provided, will use the default idp and extract the userId from the auth token
    await sdk.user.rights.grant({
        userRights: { canExecuteAsAnyParty: true },
    })
}
