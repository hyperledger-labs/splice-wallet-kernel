import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })

    const keys = EXISTING_PARTY_1_KEYS

    return await sdk.keys.fingerprint(keys.publicKey)
}
