import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    decodePreparedTransaction,
    PreparedTransaction,
} from '@canton-network/wallet-sdk'
import { v4 } from 'uuid'

export default async function () {
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
    })
    await sdk.connect()

    const myParty = global.EXISTING_PARTY_1
    const preparedCommand = global.PREPARED_COMMAND

    await sdk.setPartyId(myParty)
    const preparedTransaction = await sdk.userLedger!.prepareSubmission(
        preparedCommand, //the incoming command
        v4() //a unique deduplication id for this transaction
    )

    const decodedTransaction = decodePreparedTransaction(
        preparedTransaction!.preparedTransaction!
    )

    PreparedTransaction.toJson(decodedTransaction)

    // Here you can use your choice of JSON visualizer
}
