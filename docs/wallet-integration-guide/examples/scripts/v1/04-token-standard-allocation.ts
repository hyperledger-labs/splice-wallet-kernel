import pino from 'pino'
import { localNetStaticConfig, Sdk } from '@canton-network/wallet-sdk'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import { AuthTokenProvider } from '@canton-network/core-wallet-auth'
import { KeyPair } from '@canton-network/core-signing-lib'
import { JSContractEntry } from '@canton-network/core-ledger-client'

const logger = pino({ name: 'v1-token-standard-allocation', level: 'info' })

type PartyInfo = {
    partyId: string
    publicKeyFingerprint: string
    topologyTransactions?: string[] | undefined
    multiHash: string
    keyPair: KeyPair
}

const authTokenProvider = new AuthTokenProvider(
    {
        method: 'self_signed',
        issuer: 'unsafe-auth',
        credentials: {
            clientId: 'ledger-api-user',
            clientSecret: 'unsafe',
            audience: 'https://canton.network.global',
            scope: '',
        },
    },
    logger
)

const isAdmin = true

const sdk = await Sdk.create({
    authTokenProvider,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    tokenStandardUrl: localNetStaticConfig.LOCALNET_TOKEN_STANDARD_URL,
    scanApiBaseUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
    isAdmin,
})

// This example needs uploaded .dar for splice-token-test-trading-app
// It's in files of localnet, but it's not uploaded to participant, so we need to do this in the script
// Adjust if to your .localnet location
const PATH_TO_LOCALNET = '../../../../../.localnet'
const PATH_TO_DAR_IN_LOCALNET = '/dars/splice-token-test-trading-app-1.0.0.dar'
const TRADING_APP_PACKAGE_ID =
    'e5c9847d5a88d3b8d65436f01765fc5ba142cc58529692e2dacdd865d9939f71'

const here = path.dirname(fileURLToPath(import.meta.url))

const tradingDarPath = path.join(
    here,
    PATH_TO_LOCALNET,
    PATH_TO_DAR_IN_LOCALNET
)

const darBytes = await fs.readFile(tradingDarPath)
await sdk.ledger.dar.upload(darBytes, TRADING_APP_PACKAGE_ID)

//TODO: add token standard allocation example here
const allocatedParties = await Promise.all(
    ['alice', 'bob', 'venue'].map(async (partyHint) => {
        const partyKeys = sdk.keys.generate()
        const party = await sdk.party.external
            .create(partyKeys.publicKey, {
                partyHint,
            })
            .sign(partyKeys.privateKey)
            .execute()

        return [
            partyHint,
            {
                partyId: party.partyId,
                publicKeyFingerprint: party.publicKeyFingerprint,
                multiHash: party.multiHash,
                topologyTransactions: party.topologyTransactions,
                keyPair: partyKeys,
            },
        ] as const
    })
)

const partyInfo: Map<string, PartyInfo> = new Map(allocatedParties)

const sender = partyInfo.get('alice')!
const recipient = partyInfo.get('bob')!
const venue = partyInfo.get('venue')!

// Mint holdings for alice

const [amuletTapCommand, amuletTapDisclosedContracts] = await sdk.amulet.tap(
    partyInfo.get('alice')!.partyId,
    '2000000'
)

await (
    await sdk.ledger.prepare({
        partyId: sender.partyId,
        commands: amuletTapCommand,
        disclosedContracts: amuletTapDisclosedContracts,
    })
)
    .sign(sender.keyPair.privateKey)
    .execute({ partyId: sender.partyId })

// Mint holdings for bob

const [amuletTapCommandBob, amuletTapDisclosedContractsBob] =
    await sdk.amulet.tap(recipient.partyId, '2000000')

await (
    await sdk.ledger.prepare({
        partyId: recipient.partyId,
        commands: amuletTapCommandBob,
        disclosedContracts: amuletTapDisclosedContractsBob,
    })
)
    .sign(recipient.keyPair.privateKey)
    .execute({ partyId: recipient.partyId })

//Alice creates OTCTradeProposal

const amuletAsset = await sdk.asset.find(
    'Amulet',
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)

const transferLegs = {
    leg0: {
        sender: sender.partyId,
        receiver: recipient.partyId,
        amount: '100',
        instrumentId: { admin: amuletAsset.admin, id: 'Amulet' },
        meta: { values: {} },
    },
    leg1: {
        sender: recipient.partyId,
        receiver: sender.partyId,
        amount: '20',
        instrumentId: { admin: amuletAsset.admin, id: 'Amulet' },
        meta: { values: {} },
    },
}

const createProposal = {
    CreateCommand: {
        templateId:
            '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
        createArguments: {
            venue: venue.partyId,
            tradeCid: null,
            transferLegs,
            approvers: [sender.partyId],
        },
    },
}

await (
    await sdk.ledger.prepare({
        partyId: sender.partyId,
        commands: createProposal,
        disclosedContracts: [],
    })
)
    .sign(sender.keyPair.privateKey)
    .execute({ partyId: sender.partyId })

logger.info(
    'OTC Trade Proposal created by Alice, ready for Bob to accept OTCTradeProposal'
)

// Bob accepts OTCTradeProposal

const activeTradeProposals = await sdk.ledger.acs.read({
    templateIds: [
        '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
    ],
    parties: [recipient.partyId],
    filterByParty: true,
})

function getActiveContractCid(entry: JSContractEntry) {
    if ('JsActiveContract' in entry) {
        return entry.JsActiveContract.createdEvent.contractId
    }
}

const otcpCid = getActiveContractCid(activeTradeProposals?.[0]?.contractEntry!)

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
            choiceArgument: { approver: recipient.partyId },
        },
    },
]

await (
    await sdk.ledger.prepare({
        partyId: recipient.partyId,
        commands: acceptCmd,
        disclosedContracts: [],
    })
)
    .sign(recipient.keyPair.privateKey)
    .execute({ partyId: recipient.partyId })

logger.info('Bob accepted OTCTradeProposal')

//Venue initiates settlement of OTCTradeProposal

const activeTradeProposals2 = await sdk.ledger.acs.read({
    templateIds: [
        '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
    ],
    parties: [venue.partyId],
    filterByParty: true,
})

const now = new Date()
const prepareUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
const settleBefore = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()

const otcpCid2 = getActiveContractCid(
    activeTradeProposals2?.[0]?.contractEntry!
)

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

await (
    await sdk.ledger.prepare({
        partyId: venue.partyId,
        commands: initiateSettlementCmd,
        disclosedContracts: [],
    })
)
    .sign(venue.keyPair.privateKey)
    .execute({ partyId: venue.partyId })

logger.info('Venue initated settlement of OTCTradeProposal')

const otcTrades = await sdk.ledger.acs.read({
    templateIds: [
        '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTrade',
    ],
    parties: [venue.partyId],
    filterByParty: true,
})

const otcTradeCid = getActiveContractCid(otcTrades?.[0]?.contractEntry!)

if (!otcTradeCid) throw new Error('OTCTrade not found for venue')

logger.info({ otcTradeCid }, `OtcTrades were found`)

const pendingAllocationRequestsAlice =
    await sdk.token.allocation.request.pending(sender.partyId)

const allocationRequestViewAlice =
    pendingAllocationRequestsAlice?.[0].interfaceViewValue!

const legIdAlice = Object.keys(allocationRequestViewAlice.transferLegs).find(
    (key) =>
        allocationRequestViewAlice.transferLegs[key].sender === sender.partyId
)!
if (!legIdAlice) throw new Error(`No leg found for Alice`)

const legAlice = allocationRequestViewAlice.transferLegs[legIdAlice]

const specAlice = {
    settlement: allocationRequestViewAlice.settlement,
    transferLegId: legIdAlice,
    transferLeg: legAlice,
}

//TODO: go over if we should pass in expectedAdmin or instrumentId/registryUrl

const [allocateCmdAlice, allocateDisclosedAlice] =
    await sdk.token.allocation.instruction.create({
        allocationSpecification: specAlice,
        instrumentId: amuletAsset.id,
        registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
    })

await (
    await sdk.ledger.prepare({
        partyId: sender.partyId,
        commands: allocateCmdAlice,
        disclosedContracts: allocateDisclosedAlice,
    })
)
    .sign(sender.keyPair.privateKey)
    .execute({ partyId: sender.partyId })

logger.info('Alice created Allocation for her TransferLeg')

const pendingAllocationRequestsBob = await sdk.token.allocation.request.pending(
    recipient.partyId
)

const allocationRequestViewBob =
    pendingAllocationRequestsBob?.[0].interfaceViewValue!

const legIdBob = Object.keys(allocationRequestViewAlice.transferLegs).find(
    (key) =>
        allocationRequestViewAlice.transferLegs[key].sender ===
        recipient!.partyId
)!
if (!legIdBob) throw new Error(`No leg found for Bob`)

const legBob = allocationRequestViewAlice.transferLegs[legIdBob]

const specBob = {
    settlement: allocationRequestViewBob.settlement,
    transferLegId: legIdBob,
    transferLeg: legBob,
}

//TODO: go over if we should pass in expectedAdmin or instrumentId/registryUrl

const [allocateCmdBob, allocateDisclosedBlice] =
    await sdk.token.allocation.instruction.create({
        allocationSpecification: specBob,
        instrumentId: amuletAsset.id,
        registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
    })

await (
    await sdk.ledger.prepare({
        partyId: recipient.partyId,
        commands: allocateCmdBob,
        disclosedContracts: allocateDisclosedBlice,
    })
)
    .sign(recipient.keyPair.privateKey)
    .execute({ partyId: recipient.partyId })

logger.info('Bob created Allocation for his TransferLeg')

// Once the legs have been allocated, venue settles the trade triggering transfer of holdings

const allocationsVenue = await sdk.token.allocation.pending(venue.partyId)

const settlementRefId = allocationRequestViewAlice.settlement.settlementRef.id
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
        const choiceContext = await sdk.token.allocation.context.execute(
            cid,
            localNetStaticConfig.LOCALNET_REGISTRY_API_URL
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

await (
    await sdk.ledger.prepare({
        partyId: venue.partyId,
        commands: settleCmd,
        disclosedContracts: uniqueDisclosedContracts,
    })
)
    .sign(venue.keyPair.privateKey)
    .execute({ partyId: venue.partyId })

logger.info(
    'Venue settled the OTCTrade, holdings are transfered to Alice and Bob'
)

await sdk.token
    .utxos({
        partyId: sender.partyId,
    })
    .then((transactions) => {
        logger.info(
            transactions,
            'Token Standard Holding Transactions (Alice):'
        )
    })

await sdk.token
    .utxos({
        partyId: recipient.partyId,
    })
    .then((transactions) => {
        logger.info(transactions, 'Token Standard Holding Transactions (Bob):')
    })
