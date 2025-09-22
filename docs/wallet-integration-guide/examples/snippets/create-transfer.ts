import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTokenStandardDefault,
} from '@canton-network/wallet-sdk'
import { v4 } from 'uuid'

const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
})

const sender = 'sender-party'
const senderKey = 'private-key-for-my-party'
const instrumentAdminPartyId = 'Admin of the instrument'

await sdk.connect()
await sdk.setPartyId(myParty)

const [transferCommand, disclosedContracts2] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        '100',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        utxos?.map((t) => t.contractId),
        'memo-ref'
    )

const offsetLatest = (await sdk.userLedger?.ledgerEnd())?.offset ?? 0

const transferCommandId =
    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        [{ ExerciseCommand: transferCommand }],
        keyPairSender.privateKey,
        v4(),
        disclosedContracts2
    )
logger.info('Submitted transfer transaction')

const completion = await sdk.userLedger?.waitForCompletion(
    offsetLatest,
    5000,
    transferCommandId!
)
