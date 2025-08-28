import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
} from '@splice/wallet-sdk'
import { v4 } from 'uuid'

const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
})

await sdk.connect()

const receiver = 'target-of-ping-recieving-party'

const command = sdk.userLedger?.createPingCommand(receiver)

const transaction = await sdk.userLedger?.prepareSubmission(
    command, //the prepared ping command
    v4() //a unique deduplication id for this transaction
)
