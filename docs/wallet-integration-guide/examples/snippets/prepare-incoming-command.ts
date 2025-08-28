import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    signTransactionHash,
    TopologyController,
} from '@canton-network/wallet-sdk'
import { v4 } from 'uuid'

const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: undefined, //these calls require no topology changes
})

const prepareExecuteParams = {
    commands: {}, // this is of type JsCommand
}

const preparedTransaction = await sdk.userLedger?.prepareSubmission(
    prepareExecuteParams.commands, //the incoming command
    v4() //a unique deduplication id for this transaction
)

const clientsPublicKey = 'clients-public-key-here'
const clientsPrivateKey = 'client-private-key-here'

const signature = signTransactionHash(
    preparedTransaction?.preparedTransactionHash ?? '',
    clientsPrivateKey
)

//if client calls ``prepareExecute`` then this is how they would call ``execute``
await sdk.userLedger?.executeSubmission(
    preparedTransaction!,
    signature,
    clientsPublicKey,
    v4()
)
