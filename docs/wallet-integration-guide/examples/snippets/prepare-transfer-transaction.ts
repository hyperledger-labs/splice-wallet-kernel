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

    await sdk.connect()

    const sender = 'sender-party'
    const receiver = 'receiver-party'
    const instrumentAdminPartyId = 'Admin of the instrument'

    const [transferCommand, disclosedContracts] =
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

    const transaction = await sdk.userLedger?.prepareSubmission(
        transferCommand, //the prepared ping command
        v4(), //a unique deduplication id for this transaction
        disclosedContracts //contracts that needs to be disclosed in our to execute the command
    )
}
