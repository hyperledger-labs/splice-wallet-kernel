import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

export default async function () {
    // it is important to configure the SDK correctly else you might run into connectivity or authentication issues
    const sdk = await SDK.create({
        auth: global.TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })

    const transaction = global.PREPARED_TRANSACTION
    if (!transaction.preparedTransaction) {
        throw Error('Prepared tx not found')
    }

    const calculatedTxHash = await sdk.ledger.preparedTransaction.hash(
        transaction.preparedTransaction
    )
    const hex = calculatedTxHash.toHex()
    const base64 = calculatedTxHash.toBase64()

    if (base64 !== transaction.preparedTransactionHash)
        throw Error('Incorrect hash calculated')
}
