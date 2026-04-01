import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'
import { signTransactionHash } from '@canton-network/core-signing-lib'

export default async function () {
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })
    const keys = sdk.keys.generate()

    const preparedParty = EXISTING_TOPOLOGY
    signTransactionHash(preparedParty.multiHash, keys.privateKey)
}
