import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
    localNetStaticConfig,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const logger = pino({
    name: '09-token-standard-allocation-localnet',
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
await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)

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
    keyPairVenue.privateKey,
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

sdk.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)
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

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    tapCommand,
    keyPairSender.privateKey,
    v4(),
    disclosedContracts
)

await sdk.setPartyId(receiver!.partyId)
const [tapCmdBob, tapDiscBob] = await sdk.tokenStandard!.createTap(
    receiver!.partyId,
    '2000000',
    { instrumentId: 'Amulet', instrumentAdmin: instrumentAdminPartyId }
)
await sdk.userLedger!.prepareSignExecuteAndWaitFor(
    tapCmdBob,
    keyPairReceiver.privateKey,
    v4(),
    tapDiscBob
)

await sdk.setPartyId(sender!.partyId)

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
    leg1: mkLeg(
        receiver!.partyId,
        sender!.partyId,
        '20',
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

await sdk.userLedger!.prepareSignExecuteAndWaitFor(
    createProposal,
    keyPairSender.privateKey,
    v4()
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

if (otcpCid === undefined)
    throw new Error('Unexpected lack of OTCTradeProposal contract')
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
await sdk.userLedger!.prepareSignExecuteAndWaitFor(
    acceptCmd,
    keyPairReceiver.privateKey,
    v4()
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

if (otcpCid2 === undefined)
    throw new Error('Unexpected lack of OTCTradeProposal contract')
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

await sdk.userLedger!.prepareSignExecuteAndWaitFor(
    initiateSettlementCmd,
    keyPairVenue.privateKey,
    v4()
)

const otcTrades = await sdk.userLedger!.activeContracts({
    offset: (await sdk.userLedger!.ledgerEnd()).offset,
    templateIds: [
        '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTrade',
    ],
    parties: [venue!.partyId],
    filterByParty: true,
})
const otcTradeCid =
    otcTrades?.[0]?.contractEntry?.JsActiveContract?.createdEvent.contractId
if (!otcTradeCid) throw new Error('OTCTrade not found for venue')

// Alice's leg allocation
await sdk?.setPartyId(sender!.partyId)
const pendingAllocationRequestsSender =
    await sdk.tokenStandard?.fetchPendingAllocationRequestView()

const allocationRequestViewSender =
    pendingAllocationRequestsSender?.[0].interfaceViewValue!

const settlementRefId = allocationRequestViewSender.settlement.settlementRef.id

const legEntriesAlice = Object.entries(allocationRequestViewSender.transferLegs)

const legEntryAlice = legEntriesAlice.find(
    ([, leg]) => leg.sender === sender!.partyId
)
if (!legEntryAlice)
    throw new Error(`No leg found for sender ${sender!.partyId}`)
const [legIdAlice, legAlice] = legEntryAlice

const specAlice = {
    settlement: allocationRequestViewSender.settlement,
    transferLegId: legIdAlice,
    transferLeg: legAlice,
}

const [allocateCmdAlice, allocateDisclosed] =
    await sdk.tokenStandard!.createAllocationInstruction(
        specAlice,
        legAlice.instrumentId.admin
    )

await sdk.userLedger!.prepareSignExecuteAndWaitFor(
    allocateCmdAlice,
    keyPairSender.privateKey,
    v4(),
    allocateDisclosed
)

// Bob's leg allocation
await sdk.setPartyId(receiver!.partyId)

const pendingAllocationRequestReceiver =
    await sdk.tokenStandard?.fetchPendingAllocationRequestView()

const allocationRequestViewReceiver =
    pendingAllocationRequestReceiver?.[0].interfaceViewValue!
const legEntriesBob = Object.entries(allocationRequestViewReceiver.transferLegs)

const legEntryBob = legEntriesBob.find(
    ([, leg]) => leg.sender === receiver!.partyId
)
if (!legEntryBob)
    throw new Error(`No leg found for sender ${receiver!.partyId}`)
const [legIdBob, legBob] = legEntryBob

const specBob = {
    settlement: allocationRequestViewReceiver.settlement,
    transferLegId: legIdBob,
    transferLeg: legBob,
}

const [allocateCmdBob, discsR] =
    await sdk.tokenStandard!.createAllocationInstruction(
        specBob,
        legBob.instrumentId.admin
    )

await sdk.userLedger!.prepareSignExecuteAndWaitFor(
    allocateCmdBob,
    keyPairReceiver.privateKey,
    v4(),
    discsR
)

await sdk.setPartyId(venue!.partyId)

const allocationsVenue = await sdk.tokenStandard!.fetchPendingAllocationView()
const relevantAllocations = allocationsVenue.filter(
    (a) =>
        a.interfaceViewValue.allocation.settlement.executor ===
            venue!.partyId &&
        a.interfaceViewValue.allocation.settlement.settlementRef.id ===
            settlementRefId
)
if (relevantAllocations.length === 0)
    throw new Error('No matching allocations for this trade')

const allocationEntries = await Promise.all(
    relevantAllocations.map(async (a) => {
        const cid = a.contractId
        const choiceContext =
            await sdk.tokenStandard!.getAllocationExecuteTransferChoiceContext(
                cid
            )

        return {
            cid,
            legId: a.interfaceViewValue.allocation.transferLegId,
            extraArgs: {
                context: {
                    values: choiceContext.choiceContextData?.values ?? {},
                },
                meta: { values: {} },
            },
            disclosedContracts: choiceContext.disclosedContracts ?? [],
        }
    })
)

const allocationsWithContext: Record<string, { _1: string; _2: any }> =
    Object.fromEntries(
        allocationEntries.map((e) => [e.legId, { _1: e.cid, _2: e.extraArgs }])
    )

const uniqueDisclosedContracts = Array.from(
    new Map(
        allocationEntries
            .flatMap((e) => e.disclosedContracts)
            .map((d: any) => [d.contractId, d])
    ).values()
)

const settleCmd = [
    {
        ExerciseCommand: {
            templateId:
                '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTrade',
            contractId: otcTradeCid,
            choice: 'OTCTrade_Settle',
            choiceArgument: { allocationsWithContext },
        },
    },
]

await sdk.userLedger!.prepareSignExecuteAndWaitFor(
    settleCmd,
    keyPairVenue.privateKey,
    v4(),
    uniqueDisclosedContracts
)

{
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

    await sdk.tokenStandard
        ?.listHoldingTransactions()
        .then((transactions) => {
            logger.info(
                transactions,
                'Token Standard Holding Transactions (Alice):'
            )
        })
        .catch((error) => {
            logger.error(
                { error },
                'Error listing token standard holding transactions (Alice):'
            )
        })

    await sdk.setPartyId(receiver!.partyId)
    const pendingAllocationRequestReceiver =
        await sdk.tokenStandard?.fetchPendingAllocationRequestView()
    const pendingAllocationInstructionsReceiver =
        await sdk.tokenStandard?.fetchPendingAllocationInstructionView()

    const pendingAllocationsReceiver =
        await sdk.tokenStandard?.fetchPendingAllocationView()

    await sdk.tokenStandard
        ?.listHoldingTransactions()
        .then((transactions) => {
            logger.info(
                transactions,
                'Token Standard Holding Transactions (Bob):'
            )
        })
        .catch((error) => {
            logger.error(
                { error },
                'Error listing token standard holding transactions (Bob):'
            )
        })

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

    await sdk.tokenStandard
        ?.listHoldingTransactions()
        .then((transactions) => {
            logger.info(
                transactions,
                'Token Standard Holding Transactions (Venue):'
            )
        })
        .catch((error) => {
            logger.error(
                { error },
                'Error listing token standard holding transactions (Venue):'
            )
        })
}
