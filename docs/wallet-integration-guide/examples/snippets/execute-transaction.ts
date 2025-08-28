import {
    localNetAuthDefault,
    localNetLedgerDefault,
    WalletSDKImpl,
} from '@splice/wallet-sdk'
import { v4 } from 'uuid'

const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: undefined, //these calls require no topology changes
})

await sdk.connect()

const transaction = {
    preparedTransaction: 'encoded-transaction-bytes-base64',
    preparedTransactionHash:
        'hash-of-the-encoded-transaction-that-needs-to-be-signed',
    hashingSchemeVersion: 'hashing-scheme-version',
}
const publicKey = 'your-public-key-here'
const signature = 'your-signed-transaction-hash-here'

sdk.userLedger?.executeSubmission(transaction, signature, publicKey, v4())
