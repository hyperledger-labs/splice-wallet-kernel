import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    decodePreparedTransaction,
    PreparedTransaction,
} from '@splice/wallet-sdk'
import { v4 } from 'uuid'

const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
})

const prepareExecuteParams = {
    commands: {}, // this is of type JsCommand
}

const preparedTransaction = await sdk.userLedger?.prepareSubmission(
    prepareExecuteParams.commands, //the incoming command
    v4() //a unique deduplication id for this transaction
)

const decodedTransaction = decodePreparedTransaction(
    preparedTransaction!.preparedTransaction!
)

const JsonTransaction = PreparedTransaction.toJson(decodedTransaction)

// Here you can use your choice of JSON visualizer
