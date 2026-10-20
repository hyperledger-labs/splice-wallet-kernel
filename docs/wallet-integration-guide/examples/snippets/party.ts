import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
        synchronizerId: global.LOCALNET_GLOBAL_SYNCHRONIZER,
    })

    // party namespace is immediately available
    await sdk.party.list()
}
