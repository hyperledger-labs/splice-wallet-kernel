import {
    localNetAuthDefault,
    localNetLedgerDefault,
    WalletSDKImpl,
} from '@canton-network/wallet-sdk'
import { v4 } from 'uuid'

// @disable-snapshot-test
export default async function () {
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
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

    return sdk.userLedger?.executeSubmission(
        transaction,
        signature,
        publicKey,
        v4()
    )
}
