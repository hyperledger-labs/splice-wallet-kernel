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

const logger = pino({ name: '04-token-standard-localnet', level: 'info' })

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

const synchronizers = await sdk.userLedger?.listSynchronizers()

const synchonizerId = synchronizers!.connectedSynchronizers![0].synchronizerId

await sdk.userLedger
    ?.listWallets()
    .then((wallets) => {
        logger.info(wallets, 'Wallets:')
    })
    .catch((error) => {
        logger.error({ error }, 'Error listing wallets')
    })

sdk.tokenStandard?.setSynchronizerId(synchonizerId)

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

const utxos = await sdk.tokenStandard?.listHoldingUtxos(false)
logger.info(utxos, 'List Available Token Standard Holding UTXOs')

// Alice creates transfer to Bob
logger.info('Creating transfer transaction')
const [transferCommandToReject, disclosedContracts2] =
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
        [{ ExerciseCommand: transferCommandToReject }],
        keyPairSender.privateKey,
        v4(),
        disclosedContracts2
    )
logger.info('Submitted transfer transaction')

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

await sdk.userLedger?.prepareSignAndExecuteTransaction(
    [{ ExerciseCommand: rejectTransferCommand }],
    keyPairReceiver.privateKey,
    v4(),
    disclosedContracts3
)

logger.info('Rejected transfer instruction')

// Alice creates transfer to Bob with expiry date
await sdk.setPartyId(sender!.partyId)

const utxos2 = await sdk.tokenStandard?.listHoldingUtxos(false)
logger.info(utxos2, 'List Available Token Standard Holding UTXOs')

const EXPIRATION_MS = 10_000
const expiryDate = new Date(Date.now() + EXPIRATION_MS) // 5s from now
const [transferCommandToExpire, disclosedContracts4] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        '100',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        utxos2?.map((t) => t.contractId),
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
logger.info('Submitted transfer transaction')

await sdk.userLedger?.waitForCompletion(
    offsetLatest2,
    5000,
    transferCommandId2!
)

const pendingInstructions2 =
    await sdk.tokenStandard?.fetchPendingTransferInstructionView()

const transferCid2 = pendingInstructions2?.[0].contractId!

// Wait for transfer instruction to expire
await new Promise((res) => setTimeout(res, EXPIRATION_MS + 5_000))

// Alice withdraws the expired transfer
const [withdrawTransferCommand, disclosedContracts5] =
    await sdk.tokenStandard!.exerciseTransferInstructionChoice(
        transferCid2,
        'Withdraw'
    )

await sdk.userLedger?.prepareSignAndExecuteTransaction(
    [{ ExerciseCommand: withdrawTransferCommand }],
    keyPairSender.privateKey,
    v4(),
    disclosedContracts5
)

logger.info('Withdrawn transfer instruction')

await new Promise((res) => setTimeout(res, 5000))

// Alice creates transfer to Bob
const utxos3 = await sdk.tokenStandard?.listHoldingUtxos(false)
logger.info(utxos3, 'List Available Token Standard Holding UTXOs')
const [transferCommandToAccept, disclosedContracts6] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        '100',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        utxos3?.map((t) => t.contractId),
        'memo-ref'
    )

const offsetLatest3 = (await sdk.userLedger?.ledgerEnd())?.offset ?? 0

const transferCommandId3 =
    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        [{ ExerciseCommand: transferCommandToAccept }],
        keyPairSender.privateKey,
        v4(),
        disclosedContracts6
    )
logger.info('Submitted transfer transaction')

await sdk.userLedger?.waitForCompletion(
    offsetLatest3,
    5000,
    transferCommandId3!
)

// Bob accepts the transfer
await sdk.setPartyId(receiver!.partyId)

const pendingInstructions3 =
    await sdk.tokenStandard?.fetchPendingTransferInstructionView()
const transferCid3 = pendingInstructions3?.[0].contractId!

const [acceptTransferCommand, disclosedContracts7] =
    await sdk.tokenStandard!.exerciseTransferInstructionChoice(
        transferCid3,
        'Accept'
    )

const offsetLatest4 = (await sdk.userLedger?.ledgerEnd())?.offset ?? 0

const transferCommandId4 =
    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        [{ ExerciseCommand: acceptTransferCommand }],
        keyPairReceiver.privateKey,
        v4(),
        disclosedContracts7
    )
logger.info('Accepted transfer instruction')

await sdk.userLedger?.waitForCompletion(
    offsetLatest4,
    5000,
    transferCommandId4!
)

await new Promise((res) => setTimeout(res, 5000))
{
    await sdk.setPartyId(sender!.partyId)
    const aliceHoldings = await sdk.tokenStandard?.listHoldingTransactions()
    logger.info(aliceHoldings, '[ALICE] holding transactions')

    await sdk.setPartyId(receiver!.partyId)
    const bobHoldings = await sdk.tokenStandard?.listHoldingTransactions()
    logger.info(bobHoldings, '[BOB] holding transactions')
}
