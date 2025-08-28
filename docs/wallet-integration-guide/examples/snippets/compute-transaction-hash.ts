import { TopologyController } from '@canton-network/wallet-sdk'

const transaction = {
    preparedTransaction: 'encoded-transaction-bytes-base64',
    preparedTransactionHash:
        'hash-of-the-encoded-transaction-that-needs-to-be-signed',
    hashingSchemeVersion: 'hashing-scheme-version',
}

const hash = TopologyController.createTransactionHash(
    transaction.preparedTransaction
)
