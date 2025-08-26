import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    TopologyController,
} from '@splice/sdk-wallet'
import { v4 } from 'uuid'

const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: undefined, //these calls require no topology changes
})

const transaction = {
    preparedTransaction: 'encoded-transaction-bytes-base64',
    preparedTransactionHash:
        'hash-of-the-encoded-transaction-that-needs-to-be-signed',
    hashingSchemeVersion: 'hashing-scheme-version',
}

const hash = TopologyController.createTransactionHash(
    transaction.preparedTransaction
)
