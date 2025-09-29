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
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const logger = pino({
    name: '08-token-standard-allocation-localnet',
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
const keyPairVenue = createKeyPair()

await sdk.connectAdmin()
await sdk.connectTopology(LOCALNET_VALIDATOR_URL)

const here = path.dirname(fileURLToPath(import.meta.url))

const tradingDarPath = path.join(
    here,
    '../../../../.localnet/dars/splice-token-test-trading-app-1.0.0.dar'
)

try {
    const darBytes = await fs.readFile(tradingDarPath)
    const resp = await sdk.adminLedger?.ensureDarUploaded(darBytes)
    logger.info(
        { tradingDarPath, resp },
        'Trading app DAR ensured on participant (uploaded or already present)'
    )
} catch (e) {
    logger.error({ e, tradingDarPath }, 'Failed to ensure trading app DAR')
    throw e
}

const isDarThere = await sdk.adminLedger?.checkTestApp()
logger.info({ isDarThere })

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

const venue = await sdk.topology?.prepareSignAndSubmitExternalParty(
    keyPairReceiver.privateKey,
    'venue'
)
logger.info(`Created party: ${venue!.partyId}`)

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

const [tapCommand, disclosedContracts] = await sdk.tokenStandard!.createTap(
    sender!.partyId,
    '2000000',
    {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    }
)

await sdk.userLedger?.prepareSignAndExecuteTransaction(
    tapCommand,
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

type InstrumentId = {
    admin: string
    id: string
}

type Metadata = {
    values: { [key: string]: string }
}

type TransferLeg = {
    sender: string
    receiver: string
    amount: string
    instrumentId: InstrumentId
    meta: Metadata
}

const mkLeg = (
    sender: string,
    receiver: string,
    amount: string,
    admin: string,
    id: string
): TransferLeg => ({
    sender,
    receiver,
    amount,
    instrumentId: { admin, id },
    meta: { values: {} },
})

const transferLegs = {
    leg0: mkLeg(
        sender!.partyId,
        receiver!.partyId,
        '100',
        instrumentAdminPartyId,
        'Amulet'
    ),
}

const createProposal = {
    CreateCommand: {
        templateId:
            '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
        createArguments: {
            venue: venue!.partyId,
            tradeCid: null,
            transferLegs,
            approvers: [sender!.partyId],
        },
    },
}

const cmdId = await sdk.userLedger!.prepareSignAndExecuteTransaction(
    createProposal,
    keyPairSender.privateKey,
    v4()
)

await sdk.userLedger?.waitForCompletion(
    (await sdk.userLedger?.ledgerEnd())?.offset ?? 0,
    15000,
    cmdId!
)

await sdk.setPartyId(receiver!.partyId)
const activeTradeProposals = await sdk.userLedger?.activeContracts({
    offset: (await sdk.userLedger!.ledgerEnd()).offset,
    templateIds: [
        '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
    ],
    parties: [receiver!.partyId],
    filterByParty: true,
})

const otcpCid =
    activeTradeProposals?.[0]?.contractEntry?.JsActiveContract?.createdEvent
        .contractId
const acceptCmd = [
    {
        ExerciseCommand: {
            templateId:
                '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
            contractId: otcpCid,
            choice: 'OTCTradeProposal_Accept',
            choiceArgument: { approver: receiver!.partyId },
        },
    },
]
const offsetAcceptOtcp = (await sdk.userLedger!.ledgerEnd()).offset || 0
const acceptOtcpCommandId =
    await sdk.userLedger!.prepareSignAndExecuteTransaction(
        acceptCmd,
        keyPairReceiver.privateKey,
        v4()
    )
await sdk.userLedger!.waitForCompletion(
    offsetAcceptOtcp,
    60_000,
    acceptOtcpCommandId
)

await sdk.setPartyId(venue!.partyId)
const activeTradeProposals2 = await sdk.userLedger?.activeContracts({
    offset: (await sdk.userLedger!.ledgerEnd()).offset,
    templateIds: [
        '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
    ],
    parties: [venue!.partyId],
    filterByParty: true,
})

const now = new Date()
const prepareUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
const settleBefore = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()

const otcpCid2 =
    activeTradeProposals2?.[0]?.contractEntry?.JsActiveContract?.createdEvent
        .contractId
const initiateSettlementCmd = [
    {
        ExerciseCommand: {
            templateId:
                '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
            contractId: otcpCid2,
            choice: 'OTCTradeProposal_InitiateSettlement',
            choiceArgument: { prepareUntil, settleBefore },
        },
    },
]
const offsetInitiateSettlementOtcp =
    (await sdk.userLedger!.ledgerEnd()).offset || 0
const initiateSettlementOtcpCommandId =
    await sdk.userLedger!.prepareSignAndExecuteTransaction(
        initiateSettlementCmd,
        keyPairReceiver.privateKey,
        v4()
    )
await sdk.userLedger!.waitForCompletion(
    offsetInitiateSettlementOtcp,
    60_000,
    initiateSettlementOtcpCommandId
)

await sdk.setPartyId(sender!.partyId)
const pendingAllocationRequestSender =
    await sdk.tokenStandard?.fetchPendingAllocationRequestView()
const pendingAllocationInstructionsSender =
    await sdk.tokenStandard?.fetchPendingAllocationInstructionView()

const pendingAllocationsSender =
    await sdk.tokenStandard?.fetchPendingAllocationView()

logger.info(
    {
        pendingAllocationRequestSender,
        pendingAllocationInstructionsSender,
        pendingAllocationsSender,
    },
    'Pending Allocation (Alice)'
)

await sdk.setPartyId(receiver!.partyId)
const pendingAllocationRequestReceiver =
    await sdk.tokenStandard?.fetchPendingAllocationRequestView()
const pendingAllocationInstructionsReceiver =
    await sdk.tokenStandard?.fetchPendingAllocationInstructionView()

const pendingAllocationsReceiver =
    await sdk.tokenStandard?.fetchPendingAllocationView()

logger.info(
    {
        pendingAllocationRequestReceiver,
        pendingAllocationInstructionsReceiver,
        pendingAllocationsReceiver,
    },
    'Pending Allocation (Bob)'
)

await sdk.setPartyId(venue!.partyId)
const pendingAllocationRequestVenue =
    await sdk.tokenStandard?.fetchPendingAllocationRequestView()
const pendingAllocationInstructionsVenue =
    await sdk.tokenStandard?.fetchPendingAllocationInstructionView()

const pendingAllocationsVenue =
    await sdk.tokenStandard?.fetchPendingAllocationView()

logger.info(
    {
        pendingAllocationRequestVenue,
        pendingAllocationInstructionsVenue,
        pendingAllocationsVenue,
    },
    'Pending Allocation (Venue)'
)
