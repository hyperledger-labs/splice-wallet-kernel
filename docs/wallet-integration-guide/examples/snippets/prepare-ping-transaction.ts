import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
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

    const receiver = 'target-of-ping-recieving-party'

    const command = sdk.userLedger?.createPingCommand(receiver)

    return await sdk.userLedger?.prepareSubmission(
        command, //the prepared ping command
        v4() //a unique deduplication id for this transaction
    )
}
