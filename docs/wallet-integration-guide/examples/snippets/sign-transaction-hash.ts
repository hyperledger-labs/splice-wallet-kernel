import {
    createKeyPair,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetStaticConfig,
    signTransactionHash,
    WalletSDKImpl,
} from '@canton-network/wallet-sdk'

export default async function () {
    const keys = createKeyPair()
    const transaction = EXISTING_TOPOLOGY

    signTransactionHash(transaction.multiHash, keys.privateKey)
}
