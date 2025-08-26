import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
} from '@splice/sdk-wallet'
import { v4 } from 'uuid'

const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: undefined, //these calls require no topology changes
})

const receiver = 'target-of-ping-recieving-party'

const command = sdk.userLedger?.createPingCommand(receiver)

const transaction = await sdk.userLedger?.prepareSubmission(
    command, //the prepared ping command
    v4() //a unique deduplication id for this transaction
)
