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

// This example needs uploaded .dar for splice-token-test-trading-app
// It's in files of localnet, but it's not uploaded to participant, so we need to do this in the script
// Adjust if to your .localnet location
const PATH_TO_LOCALNET = '../../../../.localnet'
const PATH_TO_DAR_IN_LOCALNET = '/dars/splice-token-test-trading-app-1.0.0.dar'
const TRADING_APP_PACKAGE_ID =
    'e5c9847d5a88d3b8d65436f01765fc5ba142cc58529692e2dacdd865d9939f71'

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

const keyPairAlice = createKeyPair()
const keyPairBob = createKeyPair()
const keyPairVenue = createKeyPair()

await sdk.connectAdmin()
await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)

const here = path.dirname(fileURLToPath(import.meta.url))

const tradingDarPath = path.join(
    here,
    PATH_TO_LOCALNET,
    PATH_TO_DAR_IN_LOCALNET
)

const isDarUploaded = await sdk.userLedger?.isPackageUploaded(
    TRADING_APP_PACKAGE_ID
)
logger.info({ isDarUploaded }, 'Status of TradingApp dar upload')

if (!isDarUploaded) {
    try {
        const darBytes = await fs.readFile(tradingDarPath)
        await sdk.adminLedger?.uploadDar(darBytes)
        logger.info(
            'Trading app DAR ensured on participant (uploaded or already present)'
        )
    } catch (e) {
        logger.error(
            { e, tradingDarPath },
            'Failed to ensure trading app DAR uploaded'
        )
        throw e
    }
}

const alice = await sdk.userLedger?.signAndAllocateExternalParty(
    keyPairAlice.privateKey,
    'alice'
)
logger.info(`Created party: ${alice!.partyId}`)
await sdk.setPartyId(alice!.partyId)

const bob = await sdk.userLedger?.signAndAllocateExternalParty(
    keyPairBob.privateKey,
    'bob'
)
logger.info(`Created party: ${bob!.partyId}`)

const venue = await sdk.userLedger?.signAndAllocateExternalParty(
    keyPairVenue.privateKey,
    'venue'
)
logger.info(`Created party: ${venue!.partyId}`)

sdk.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)
const instrumentAdminPartyId =
    (await sdk.tokenStandard?.getInstrumentAdmin()) || ''

// Mint holdings for Alice
const [tapCommand, disclosedContracts] = await sdk.tokenStandard!.createTap(
    alice!.partyId,
    '2000000',
    {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    }
)

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    tapCommand,
    keyPairAlice.privateKey,
    v4(),
    disclosedContracts
)

// Mint holdings for Bob
await sdk.setPartyId(bob!.partyId)
const [tapCmdBob, tapDiscBob] = await sdk.tokenStandard!.createTap(
    bob!.partyId,
    '2000000',
    { instrumentId: 'Amulet', instrumentAdmin: instrumentAdminPartyId }
)
await sdk.userLedger!.prepareSignExecuteAndWaitFor(
    tapCmdBob,
    keyPairBob.privateKey,
    v4(),
    tapDiscBob
)

// Alice creates OTCTradeProposal
await sdk.setPartyId(alice!.partyId)

// Define what holdings each party will trade
const transferLegs = {
    leg0: {
        sender: alice!.partyId,
        receiver: bob!.partyId,
        amount: '100',
        instrumentId: { admin: instrumentAdminPartyId, id: 'Amulet' },
        meta: { values: {} },
    },
    leg1: {
        sender: bob!.partyId,
        receiver: alice!.partyId,
        amount: '20',
        instrumentId: { admin: instrumentAdminPartyId, id: 'Amulet' },
        meta: { values: {} },
    },
}

const createProposal = {
    CreateCommand: {
        templateId:
            '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
        createArguments: {
            venue: venue!.partyId,
            tradeCid: null,
            transferLegs,
            approvers: [alice!.partyId],
        },
    },
}

await sdk.userLedger!.prepareSignExecuteAndWaitFor(
    createProposal,
    keyPairAlice.privateKey,
    v4()
)

logger.info('Alice created OTCTradeProposal')

// Bob accepts the OTCTradeProposal
await sdk.setPartyId(bob!.partyId)
const activeTradeProposals = await sdk.userLedger?.activeContracts({
    offset: (await sdk.userLedger!.ledgerEnd()).offset,
    templateIds: [
        '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
    ],
    parties: [bob!.partyId],
    filterByParty: true,
})
const otcpCid =
    activeTradeProposals?.[0]?.contractEntry?.JsActiveContract?.createdEvent
        .contractId

if (otcpCid === undefined) {
    throw new Error('Unexpected lack of OTCTradeProposal contract')
}

const acceptCmd = [
    {
        ExerciseCommand: {
            templateId:
                '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
            contractId: otcpCid,
            choice: 'OTCTradeProposal_Accept',
            choiceArgument: { approver: bob!.partyId },
        },
    },
]
await sdk.userLedger!.prepareSignExecuteAndWaitFor(
    acceptCmd,
    keyPairBob.privateKey,
    v4()
)

logger.info('Bob accepted OTCTradeProposal')

// Venue initiates settlement of OTCTradeProposal
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

logger.info('Venue initated settlement of OTCTradeProposal')

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
await sdk?.setPartyId(alice!.partyId)
const pendingAllocationRequestsAlice =
    await sdk.tokenStandard?.fetchPendingAllocationRequestView()

const allocationRequestViewAlice =
    pendingAllocationRequestsAlice?.[0].interfaceViewValue!

const settlementRefId = allocationRequestViewAlice.settlement.settlementRef.id

const legIdAlice = Object.keys(allocationRequestViewAlice.transferLegs).find(
    (key) =>
        allocationRequestViewAlice.transferLegs[key].sender === alice!.partyId
)!
if (!legIdAlice) throw new Error(`No leg found for Alice`)

const legAlice = allocationRequestViewAlice.transferLegs[legIdAlice]

const specAlice = {
    settlement: allocationRequestViewAlice.settlement,
    transferLegId: legIdAlice,
    transferLeg: legAlice,
}

const [allocateCmdAlice, allocateDisclosedAlice] =
    await sdk.tokenStandard!.createAllocationInstruction(
        specAlice,
        legAlice.instrumentId.admin
    )

await sdk.userLedger!.prepareSignExecuteAndWaitFor(
    allocateCmdAlice,
    keyPairAlice.privateKey,
    v4(),
    allocateDisclosedAlice
)

logger.info('Alice created Allocation for her TransferLeg')

// Bob's leg allocation
await sdk.setPartyId(bob!.partyId)

const pendingAllocationRequestBob =
    await sdk.tokenStandard?.fetchPendingAllocationRequestView()

const allocationRequestViewBob =
    pendingAllocationRequestBob?.[0].interfaceViewValue!

const legIdBob = Object.keys(allocationRequestViewAlice.transferLegs).find(
    (key) =>
        allocationRequestViewAlice.transferLegs[key].sender === bob!.partyId
)!
if (!legIdBob) throw new Error(`No leg found for Bob`)

const legBob = allocationRequestViewAlice.transferLegs[legIdBob]

const specBob = {
    settlement: allocationRequestViewBob.settlement,
    transferLegId: legIdBob,
    transferLeg: legBob,
}

const [allocateCmdBob, AllocateDisclosedABob] =
    await sdk.tokenStandard!.createAllocationInstruction(
        specBob,
        legBob.instrumentId.admin
    )

await sdk.userLedger!.prepareSignExecuteAndWaitFor(
    allocateCmdBob,
    keyPairBob.privateKey,
    v4(),
    AllocateDisclosedABob
)
logger.info('Bob created Allocation for her TransferLeg')

// Once the legs have been allocated, venue settles the trade triggering transfer of holdings
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

logger.info(
    'Venue settled the OTCTrade, holdings are transfered to Alice and Bob'
)

{
    await sdk.setPartyId(alice!.partyId)
    await sdk.tokenStandard?.listHoldingTransactions().then((transactions) => {
        logger.info(
            transactions,
            'Token Standard Holding Transactions (Alice):'
        )
    })

    await sdk.setPartyId(bob!.partyId)
    await sdk.tokenStandard?.listHoldingTransactions().then((transactions) => {
        logger.info(transactions, 'Token Standard Holding Transactions (Bob):')
    })
}
