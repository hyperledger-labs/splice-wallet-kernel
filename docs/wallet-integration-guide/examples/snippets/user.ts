import { localNetStaticConfig, SDK } from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = await SDK.create({
        auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })

    const primaryParty = EXISTING_PARTY_1
    const userId = 'user-id'

    // user namespace is immediately available
    await sdk.user.create({ userId, primaryParty })
}
