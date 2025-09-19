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

const [tapCommand, disclosedContracts] = await sdk.tokenStandard!.createTap(
    sender!.partyId,
    '2000000',
    {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    }
)

await sdk.userLedger?.prepareSignAndExecuteTransaction(
    [{ ExerciseCommand: tapCommand }],
    keyPairSender.privateKey,
    v4(),
    disclosedContracts
)

await new Promise((res) => setTimeout(res, 5000))

const utxos = await sdk.tokenStandard?.listHoldingUtxos(false)
logger.info(utxos, 'List Available Token Standard Holding UTXOs')

await sdk.tokenStandard
    ?.listHoldingTransactions()
    .then((transactions) => {
        logger.info(transactions, 'Token Standard Holding Transactions:')
    })
    .catch((error) => {
        logger.error(
            { error },
            'Error listing token standard holding transactions:'
        )
    })

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

const completion = await sdk.userLedger?.waitForCompletion(
    offsetLatest,
    5000,
    transferCommandId!
)
logger.info({ completion }, 'Transfer transaction completed')

const pendingInstructions =
    await sdk.tokenStandard?.fetchPendingTransferInstructionView()

const transferCid = pendingInstructions?.[0].contractId!

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

await sdk.setPartyId(sender!.partyId)

const utxos2 = await sdk.tokenStandard?.listHoldingUtxos(false)
logger.info(utxos2, 'List Available Token Standard Holding UTXOs')

const expiryDate = new Date(Date.now() + 15_000) // 5s from now
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

const transferCommandId2 =
    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        [{ ExerciseCommand: transferCommandToExpire }],
        keyPairSender.privateKey,
        v4(),
        disclosedContracts4
    )
logger.info('Submitted transfer transaction')

const completion2 = await sdk.userLedger?.waitForCompletion(
    offsetLatest,
    5000,
    transferCommandId2!
)
logger.info({ completion2 }, 'Transfer transaction completed')
// TODO check if you can find it there after expiration
const pendingInstructions2 =
    await sdk.tokenStandard?.fetchPendingTransferInstructionView()

const transferCid2 = pendingInstructions?.[0].contractId!
// Wait for transfer instruction to expire
await new Promise((res) => setTimeout(res, 17500))

const [withdrawTransferCommand, disclosedContracts5] =
    await sdk.tokenStandard!.exerciseTransferInstructionChoice(
        transferCid2,
        'Withdraw'
    )

await sdk.userLedger?.prepareSignAndExecuteTransaction(
    [{ ExerciseCommand: withdrawTransferCommand }],
    keyPairReceiver.privateKey,
    v4(),
    disclosedContracts5
)

logger.info('Withdrawn transfer instruction')

await new Promise((res) => setTimeout(res, 5000))

{
    await sdk.setPartyId(sender!.partyId)
    const aliceHoldings = await sdk.tokenStandard?.listHoldingTransactions()
    logger.info(aliceHoldings, '[ALICE] holding transactions')

    await sdk.setPartyId(receiver!.partyId)
    const bobHoldings = await sdk.tokenStandard?.listHoldingTransactions()
    logger.info(bobHoldings, '[BOB] holding transactions')
}
