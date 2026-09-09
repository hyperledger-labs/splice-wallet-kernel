import {
    SDK,
    localNetGlobalSynchronizer,
    localNetStaticConfig,
} from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
        synchronizerId: localNetGlobalSynchronizer,
    })

    const keys = EXISTING_PARTY_1_KEYS

    await sdk.keys.fingerprint(keys.publicKey)
}
