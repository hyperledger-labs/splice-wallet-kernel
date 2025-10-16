import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTokenStandardDefault,
} from '@canton-network/wallet-sdk'
import { v4 } from 'uuid'

// @disable-snapshot-test
export default async function () {
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
        tokenStandardFactory: localNetTokenStandardDefault,
    })

    const sender = 'sender-party'
    const senderKey = 'private-key-for-my-party'
    const instrumentAdminPartyId = 'admin-of-the-instrument'

    const receiver = 'receiver-party'

    await sdk.connect()
    await sdk.setPartyId(sender)

    const [transferCommand, disclosedContracts2] =
        await sdk.tokenStandard!.createTransfer(
            sender,
            receiver,
            '100',
            {
                instrumentId: 'Amulet',
                instrumentAdmin: instrumentAdminPartyId,
            },
            [],
            'memo-ref'
        )

    //we use the AndWaitFor to get a completion result
    const completionResult = await sdk.userLedger?.prepareSignExecuteAndWaitFor(
        [{ ExerciseCommand: transferCommand }],
        senderKey,
        v4(),
        disclosedContracts2
    )

    const transaction = await sdk.tokenStandard!.getTransactionById(
        completionResult!.updateId
    )
}
