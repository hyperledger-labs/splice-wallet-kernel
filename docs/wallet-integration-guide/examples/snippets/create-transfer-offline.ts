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

    const factoryCtx = await sdk.tokenStandard!.getCreateTransferContext(
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
            'memo-ref',
            undefined, // expiryDate
            undefined, // meta
            {
                factoryId: factoryCtx.factoryId,
                choiceContext: factoryCtx.choiceContext,
            } // prefetchedRegistryChoiceContext
        )

    const offsetLatest = (await sdk.userLedger?.ledgerEnd())?.offset ?? 0

    const transferCommandId =
        await sdk.userLedger?.prepareSignAndExecuteTransaction(
            [{ ExerciseCommand: transferCommand }],
            senderKey,
            v4(),
            disclosedContracts2
        )

    const completion = await sdk.userLedger?.waitForCompletion(
        offsetLatest,
        5000,
        transferCommandId!
    )
}
