import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'
import { LOCALNET_REGISTRY_API_URL, LOCALNET_VALIDATOR_URL } from '../config.js'

const logger = pino({
    name: '07-token-standard-reject-expire-withdraw',
    level: 'info',
})

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const sdk = new WalletSDKImpl().configure({
    logger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: localNetTopologyDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
})

logger.info('SDK initialized')

await sdk.connect()
logger.info('Connected to ledger')

const keyPairSender = createKeyPair()
const keyPairReceiver = createKeyPair()

await sdk.connectAdmin()
await sdk.connectTopology(LOCALNET_VALIDATOR_URL)

const sender = await sdk.topology?.prepareSignAndSubmitExternalParty(
    keyPairSender.privateKey,
    'alice'
)
logger.info(`Created party: ${sender!.partyId}`)
await sdk.setPartyId(sender!.partyId)

const receiver = await sdk.topology?.prepareSignAndSubmitExternalParty(
    keyPairReceiver.privateKey,
    'bob'
)
logger.info(`Created party: ${receiver!.partyId}`)

await sdk.userLedger
    ?.listWallets()
    .then((wallets) => {
        logger.info(wallets, 'Wallets:')
    })
    .catch((error) => {
        logger.error({ error }, 'Error listing wallets')
    })

sdk.tokenStandard?.setTransferFactoryRegistryUrl(LOCALNET_REGISTRY_API_URL)
const instrumentAdminPartyId =
    (await sdk.tokenStandard?.getInstrumentAdmin()) || ''

// mint holdings for Alice
const [tapCommand, disclosedContracts] = await sdk.tokenStandard!.createTap(
    sender!.partyId,
    '2000000',
    {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    }
)

const offsetLatestTap = (await sdk.userLedger?.ledgerEnd())?.offset ?? 0

const commandIdTap = await sdk.userLedger?.prepareSignAndExecuteTransaction(
    [{ ExerciseCommand: tapCommand }],
    keyPairSender.privateKey,
    v4(),
    disclosedContracts
)

await sdk.userLedger?.waitForCompletion(offsetLatestTap, 5000, commandIdTap!)

// Alice creates transfer to Bob
logger.info('Creating transfer transaction (reject)')
const [transferCommandToReject, disclosedContracts2] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        '100',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        undefined,
        'memo-ref'
    )

const offsetLatest = (await sdk.userLedger?.ledgerEnd())?.offset ?? 0

const transferCommandId =
    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        [{ ExerciseCommand: transferCommandToReject }],
        keyPairSender.privateKey,
        v4(),
        disclosedContracts2
    )
logger.info('Submitted transfer transaction (reject)')

await sdk.userLedger?.waitForCompletion(offsetLatest, 5000, transferCommandId!)

const pendingInstructions =
    await sdk.tokenStandard?.fetchPendingTransferInstructionView()

const transferCid = pendingInstructions?.[0].contractId!

// Bob rejects the transfer
await sdk.setPartyId(receiver!.partyId)

const [rejectTransferCommand, disclosedContracts3] =
    await sdk.tokenStandard!.exerciseTransferInstructionChoice(
        transferCid,
        'Reject'
    )

const rejectCommandId = await sdk.userLedger?.prepareSignAndExecuteTransaction(
    [{ ExerciseCommand: rejectTransferCommand }],
    keyPairReceiver.privateKey,
    v4(),
    disclosedContracts3
)

logger.info('Rejected transfer instruction')

// TODO await completion
await sdk.userLedger?.waitForCompletion(
    (await sdk.userLedger?.ledgerEnd())?.offset ?? 0,
    5000,
    rejectCommandId!
)

// Alice creates transfer to Bob with expiry date
await sdk.setPartyId(sender!.partyId)
const utxosAfterRejected = await sdk.tokenStandard?.listHoldingUtxos(false)

const EXPIRATION_MS = 10_000
const expiryDate = new Date(Date.now() + EXPIRATION_MS)

logger.info('Creating transfer transaction (expire)')
const [transferCommandToExpire, disclosedContracts4] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        '100',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        undefined,
        'memo-ref',
        expiryDate
    )

const offsetLatest2 = (await sdk.userLedger?.ledgerEnd())?.offset ?? 0

const transferCommandId2 =
    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        [{ ExerciseCommand: transferCommandToExpire }],
        keyPairSender.privateKey,
        v4(),
        disclosedContracts4
    )
logger.info('Submitted transfer transaction (expire)')

await sdk.userLedger?.waitForCompletion(
    offsetLatest2,
    5000,
    transferCommandId2!
)

const pendingInstructions2 =
    await sdk.tokenStandard?.fetchPendingTransferInstructionView()

const expiredTransferCid = pendingInstructions2?.[0].contractId!

// Wait for transfer instruction to expire
await new Promise((res) => setTimeout(res, EXPIRATION_MS + 5_000))

const utxosAfterExpired = await sdk.tokenStandard?.listHoldingUtxos(false)
const unlockedUtxo = utxosAfterExpired?.find((t) => t.interfaceViewValue.lock)
if (!unlockedUtxo) {
    throw new Error('Unexpected lack of unlocked UTXO after expiration')
}
logger.info(
    { unlockedUtxo },
    'UTXO used as inputHolding in expired transfer got unlocked after expiration'
)

// Alice creates transfer that will be withdrawn
logger.info('Creating transfer transaction (withdraw)')
const [transferCommandToWithdraw, disclosedContracts5] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        '100',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        undefined,
        'memo-ref'
    )

const offsetLatest3 = (await sdk.userLedger?.ledgerEnd())?.offset ?? 0

const transferCommandId3 =
    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        [{ ExerciseCommand: transferCommandToWithdraw }],
        keyPairSender.privateKey,
        v4(),
        disclosedContracts5
    )
logger.info('Submitted transfer transaction (withdraw)')

await sdk.userLedger?.waitForCompletion(
    offsetLatest3,
    5000,
    transferCommandId3!
)

const pendingInstructions3 =
    await sdk.tokenStandard?.fetchPendingTransferInstructionView()

// Note that previous transfer instruction that expired is still pending until rejected or withdrawn,
// but input holdings used in expired transfer are unlocked and can be used
const transferCid3 = pendingInstructions3?.find(
    (transferInstruction) =>
        transferInstruction.contractId !== expiredTransferCid
)!.contractId
// Alice withdraws the transfer
const [withdrawTransferCommand, disclosedContracts6] =
    await sdk.tokenStandard!.exerciseTransferInstructionChoice(
        transferCid3!,
        'Withdraw'
    )

const offsetLatest4 = (await sdk.userLedger?.ledgerEnd())?.offset ?? 0
const withdrawCommandId =
    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        [{ ExerciseCommand: withdrawTransferCommand }],
        keyPairSender.privateKey,
        v4(),
        disclosedContracts6
    )

logger.info('Withdrawn transfer instruction')
await sdk.userLedger?.waitForCompletion(offsetLatest4, 5000, withdrawCommandId!)

const utxosAfterWithdraw = await sdk.tokenStandard?.listHoldingUtxos(false)

// Alice creates transfer to Bob to accept using reclaimed holdings
const [transferCommandToAccept, disclosedContracts7] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        '100',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        undefined,
        'memo-ref'
    )

const offsetLatest5 = (await sdk.userLedger?.ledgerEnd())?.offset ?? 0

const transferCommandId4 =
    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        [{ ExerciseCommand: transferCommandToAccept }],
        keyPairSender.privateKey,
        v4(),
        disclosedContracts7
    )
logger.info('Submitted transfer transaction')

await sdk.userLedger?.waitForCompletion(
    offsetLatest5,
    5000,
    transferCommandId4!
)

// Bob accepts the transfer
await sdk.setPartyId(receiver!.partyId)

const pendingInstructions4 =
    await sdk.tokenStandard?.fetchPendingTransferInstructionView()

const transferCid4 = pendingInstructions4?.find(
    (transferInstruction) =>
        transferInstruction.contractId !== expiredTransferCid
)!.contractId

const [acceptTransferCommand, disclosedContracts8] =
    await sdk.tokenStandard!.exerciseTransferInstructionChoice(
        transferCid4!,
        'Accept'
    )

const offsetLatest6 = (await sdk.userLedger?.ledgerEnd())?.offset ?? 0

const transferCommandId5 =
    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        [{ ExerciseCommand: acceptTransferCommand }],
        keyPairReceiver.privateKey,
        v4(),
        disclosedContracts8
    )
logger.info('Accepted transfer instruction')

await sdk.userLedger?.waitForCompletion(
    offsetLatest6,
    5000,
    transferCommandId5!
)
