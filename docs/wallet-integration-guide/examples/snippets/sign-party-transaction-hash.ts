import { signTransactionHash } from '@canton-network/wallet-sdk'

// @disable-snapshot-test
export default async function () {
    const preparedParty = { combinedHash: 'combined-hash-here' }
    const privateKey = 'your-private-key-here'

    return signTransactionHash(preparedParty.combinedHash, privateKey)
}
