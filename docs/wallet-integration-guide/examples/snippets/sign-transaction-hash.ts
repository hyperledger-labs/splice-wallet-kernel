import {
    SDK,
    localNetStaticConfig,
    signTransactionHash,
} from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })
    const keys = sdk.keys.generate()

    const preparedParty = EXISTING_TOPOLOGY

    //This signing function works for a party topology hash or a transaction hash
    signTransactionHash(preparedParty.multiHash, keys.privateKey)
}
