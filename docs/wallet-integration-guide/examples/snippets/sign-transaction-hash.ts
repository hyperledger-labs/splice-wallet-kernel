import { signTransactionHash } from '@canton-network/wallet-sdk'

// @disable-snapshot-test
export default async function () {
    const transaction = {
        preparedTransaction: 'encoded-transaction-bytes-base64',
        preparedTransactionHash:
            'hash-of-the-encoded-transaction-that-needs-to-be-signed',
        hashingSchemeVersion: 'hashing-scheme-version',
    }

    const privateKey = 'your-private-key-here'

    return signTransactionHash(transaction.preparedTransactionHash, privateKey)
}
