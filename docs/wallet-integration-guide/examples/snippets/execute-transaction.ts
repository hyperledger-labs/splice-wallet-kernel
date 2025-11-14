import {
    localNetAuthDefault,
    localNetLedgerDefault,
    signTransactionHash,
    WalletSDKImpl,
} from '@canton-network/wallet-sdk'
import { v4 } from 'uuid'

export default async function () {
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
    })

    const myParty = global.EXISTING_PARTY_1
    const transaction = global.PREPARED_TRANSACTION
    const keys = global.EXISTING_PARTY_1_KEYS

    await sdk.connect()
    await sdk.setPartyId(myParty)

    const signature = signTransactionHash(
        transaction.preparedTransactionHash,
        keys.privateKey
    )

    await sdk.userLedger!.executeSubmission(
        transaction,
        signature,
        keys.publicKey,
        v4()
    )
}
