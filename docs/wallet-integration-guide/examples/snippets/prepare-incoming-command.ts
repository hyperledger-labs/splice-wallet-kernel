import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    signTransactionHash,
} from '@canton-network/wallet-sdk'
import { v4 } from 'uuid'

export default async function () {
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
    })

    const preparedCommand = global.PREPARED_COMMAND
    const keys = global.EXISTING_PARTY_1_KEYS
    const myParty = global.EXISTING_PARTY_1

    await sdk.connect()
    await sdk.setPartyId(myParty)

    const preparedTransaction = await sdk.userLedger!.prepareSubmission(
        preparedCommand, //the incoming command
        v4() //a unique deduplication id for this transaction
    )

    const signature = signTransactionHash(
        preparedTransaction!.preparedTransactionHash ?? '',
        keys.privateKey
    )

    //if client calls ``prepareExecute`` then this is how they would call ``execute``
    await sdk.userLedger!.executeSubmission(
        preparedTransaction!,
        signature,
        keys.publicKey,
        v4()
    )
}
