import pino from 'pino'
import {
    localNetStaticConfig,
    SDK,
    toTemplateContracts,
} from '@canton-network/wallet-sdk'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import { KeyPair } from '@canton-network/core-signing-lib'
import { GenerateTransactionResponse } from '@canton-network/core-ledger-client'
import {
    TOKEN_NAMESPACE_CONFIG,
    TOKEN_PROVIDER_CONFIG_DEFAULT,
    AMULET_NAMESPACE_CONFIG,
    ASSET_CONFIG,
} from './utils/index.js'

// this is our generated javascript code using `dpm codegen js` for the splice-token-test-trading-app
import { Splice } from '@daml.js/splice-token-test-trading-app-1.0.0'

type OTCTrade_Settle = Splice.Testing.Apps.TradingApp.OTCTrade_Settle

const OTCTrade = Splice.Testing.Apps.TradingApp.OTCTrade
const OTCTradeProposal = Splice.Testing.Apps.TradingApp.OTCTradeProposal

const logger = pino({
    name: '14-token-standard-allocation-custom-dars',
    level: 'info',
})

type PartyInfo = Omit<GenerateTransactionResponse, 'topologyTransactions'> & {
    topologyTransactions?: string[] | undefined
    keyPair: KeyPair
}

const sdk = await SDK.create({
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
})

type AcsReadContract = Awaited<ReturnType<typeof sdk.ledger.acs.read>>[number]

const token = await sdk.token(TOKEN_NAMESPACE_CONFIG)
const amulet = await sdk.amulet(AMULET_NAMESPACE_CONFIG)
const asset = await sdk.asset(ASSET_CONFIG)

// This example needs uploaded .dar for splice-token-test-trading-app.
const PATH_TO_LOCALNET = '../../../../.localnet'
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

const allocatedParties = await Promise.all(
    ['v1-14-alice', 'v1-14-bob', 'v1-14-venue'].map(async (partyHint) => {
        const partyKeys = sdk.keys.generate()
        const party = await sdk.party.external
            .create(partyKeys.publicKey, { partyHint })
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
const alice = partyInfo.get('v1-14-alice')!
const bob = partyInfo.get('v1-14-bob')!
const venue = partyInfo.get('v1-14-venue')!

const [tapAlice, tapAliceDisclosed] = await amulet.tap(alice.partyId, '2000000')
await sdk.ledger
    .prepare({
        partyId: alice.partyId,
        commands: tapAlice,
        disclosedContracts: tapAliceDisclosed,
    })
    .sign(alice.keyPair.privateKey)
    .execute({ partyId: alice.partyId })

const [tapBob, tapBobDisclosed] = await amulet.tap(bob.partyId, '2000000')
await sdk.ledger
    .prepare({
        partyId: bob.partyId,
        commands: tapBob,
        disclosedContracts: tapBobDisclosed,
    })
    .sign(bob.keyPair.privateKey)
    .execute({ partyId: bob.partyId })

const amuletAsset = await asset.find(
    'Amulet',
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)

const transferLegs = {
    leg0: {
        sender: alice.partyId,
        receiver: bob.partyId,
        amount: '100',
        instrumentId: { admin: amuletAsset.admin, id: 'Amulet' },
        meta: { values: {} },
    },
    leg1: {
        sender: bob.partyId,
        receiver: alice.partyId,
        amount: '20',
        instrumentId: { admin: amuletAsset.admin, id: 'Amulet' },
        meta: { values: {} },
    },
}

// 1) venue creates proposal
await sdk.ledger
    .prepare({
        partyId: venue.partyId,
        commands: {
            CreateCommand: {
                templateId: OTCTradeProposal.templateId,
                createArguments: {
                    venue: venue.partyId,
                    tradeCid: null,
                    transferLegs,
                    approvers: [alice.partyId, bob.partyId],
                },
            },
        },
        disclosedContracts: [],
    })
    .sign(venue.keyPair.privateKey)
    .execute({ partyId: venue.partyId })

logger.info('Venue created OTCTradeProposal')

// 2) alice accepts
const proposalForAlice = toTemplateContracts<
    Splice.Testing.Apps.TradingApp.OTCTradeProposal,
    AcsReadContract
>(
    await sdk.ledger.acs.read({
        templateIds: [OTCTradeProposal.templateId],
        parties: [alice.partyId],
        filterByParty: true,
    }),
    OTCTradeProposal.templateId
)[0]

if (!proposalForAlice) {
    throw new Error('No OTCTradeProposal for alice contract found')
}

await sdk.ledger
    .prepare({
        partyId: alice.partyId,
        commands: [
            {
                ExerciseCommand: {
                    templateId: OTCTradeProposal.templateId,
                    contractId: proposalForAlice.contractId,
                    choice: OTCTradeProposal.OTCTradeProposal_Accept.choiceName,
                    choiceArgument: { approver: alice.partyId },
                },
            },
        ],
        disclosedContracts: [],
    })
    .sign(alice.keyPair.privateKey)
    .execute({ partyId: alice.partyId })

logger.info('Alice accepted OTCTradeProposal')

// 3) bob accepts
const proposalForBob = toTemplateContracts<
    Splice.Testing.Apps.TradingApp.OTCTradeProposal,
    AcsReadContract
>(
    await sdk.ledger.acs.read({
        templateIds: [OTCTradeProposal.templateId],
        parties: [bob.partyId],
        filterByParty: true,
    }),
    OTCTradeProposal.templateId
)[0]

if (!proposalForBob) {
    throw new Error('No OTCTradeProposal for bob contract found')
}

await sdk.ledger
    .prepare({
        partyId: bob.partyId,
        commands: [
            {
                ExerciseCommand: {
                    templateId: OTCTradeProposal.templateId,
                    contractId: proposalForBob.contractId,
                    choice: OTCTradeProposal.OTCTradeProposal_Accept.choiceName,
                    choiceArgument: { approver: bob.partyId },
                },
            },
        ],
        disclosedContracts: [],
    })
    .sign(bob.keyPair.privateKey)
    .execute({ partyId: bob.partyId })

logger.info('Bob accepted OTCTradeProposal')

// 4) venue initializes settlement
const proposalForVenue = toTemplateContracts<
    Splice.Testing.Apps.TradingApp.OTCTradeProposal,
    AcsReadContract
>(
    await sdk.ledger.acs.read({
        templateIds: [OTCTradeProposal.templateId],
        parties: [venue.partyId],
        filterByParty: true,
    }),
    OTCTradeProposal.templateId
)[0]

if (!proposalForVenue) {
    throw new Error('No OTCTradeProposal for venue contract found')
}

const now = new Date()
const prepareUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
const settleBefore = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()

await sdk.ledger
    .prepare({
        partyId: venue.partyId,
        commands: [
            {
                ExerciseCommand: {
                    templateId: OTCTradeProposal.templateId,
                    contractId: proposalForVenue.contractId,
                    choice: OTCTradeProposal.OTCTradeProposal_InitiateSettlement
                        .choiceName,
                    choiceArgument: { prepareUntil, settleBefore },
                },
            },
        ],
        disclosedContracts: [],
    })
    .sign(venue.keyPair.privateKey)
    .execute({ partyId: venue.partyId })

logger.info('Venue initiated settlement')

const otcTrade = toTemplateContracts<
    Splice.Testing.Apps.TradingApp.OTCTrade,
    AcsReadContract
>(
    await sdk.ledger.acs.read({
        templateIds: [OTCTrade.templateId],
        parties: [venue.partyId],
        filterByParty: true,
    }),
    OTCTrade.templateId
)[0]

if (!otcTrade) {
    throw new Error('No OTCTrade for venue contract found')
}

// 5) alice allocates leg
const pendingAllocationRequestsAlice = await token.allocation.request.pending(
    alice.partyId
)
const allocationRequestViewAlice =
    pendingAllocationRequestsAlice[0]?.interfaceViewValue
if (!allocationRequestViewAlice) {
    throw new Error('No pending allocation request found for Alice')
}

const legIdAlice = Object.keys(otcTrade.createArgument.transferLegs).find(
    (key) => otcTrade.createArgument.transferLegs[key].sender === alice.partyId
)
if (!legIdAlice) {
    throw new Error(`No transfer leg found for sender ${alice.partyId}`)
}
const [allocateCmdAlice, allocateDisclosedAlice] =
    await token.allocation.instruction.create({
        allocationSpecification: {
            settlement: allocationRequestViewAlice.settlement,
            transferLegId: legIdAlice,
            transferLeg: allocationRequestViewAlice.transferLegs[legIdAlice],
        },
        asset: amuletAsset,
    })

await sdk.ledger
    .prepare({
        partyId: alice.partyId,
        commands: allocateCmdAlice,
        disclosedContracts: allocateDisclosedAlice,
    })
    .sign(alice.keyPair.privateKey)
    .execute({ partyId: alice.partyId })

logger.info('Alice created allocation instruction for her leg')

// 6) bob allocates leg
const pendingAllocationRequestsBob = await token.allocation.request.pending(
    bob.partyId
)
const allocationRequestViewBob =
    pendingAllocationRequestsBob[0]?.interfaceViewValue
if (!allocationRequestViewBob) {
    throw new Error('No pending allocation request found for Bob')
}

const legIdBob = Object.keys(otcTrade.createArgument.transferLegs).find(
    (key) => otcTrade.createArgument.transferLegs[key].sender === bob.partyId
)
if (!legIdBob) {
    throw new Error(`No transfer leg found for sender ${bob.partyId}`)
}
const [allocateCmdBob, allocateDisclosedBob] =
    await token.allocation.instruction.create({
        allocationSpecification: {
            settlement: allocationRequestViewBob.settlement,
            transferLegId: legIdBob,
            transferLeg: allocationRequestViewBob.transferLegs[legIdBob],
        },
        asset: amuletAsset,
    })

await sdk.ledger
    .prepare({
        partyId: bob.partyId,
        commands: allocateCmdBob,
        disclosedContracts: allocateDisclosedBob,
    })
    .sign(bob.keyPair.privateKey)
    .execute({ partyId: bob.partyId })

logger.info('Bob created allocation instruction for his leg')

// 7) venue settles
const allocationsVenue = await token.allocation.pending(venue.partyId)
const settlementRefId = allocationRequestViewAlice.settlement.settlementRef.id
const relevantAllocations = allocationsVenue.filter(
    (allocation) =>
        allocation.interfaceViewValue.allocation.settlement.executor ===
            venue.partyId &&
        allocation.interfaceViewValue.allocation.settlement.settlementRef.id ===
            settlementRefId
)

if (relevantAllocations.length === 0) {
    throw new Error('No matching allocations found for settlement')
}

const allocationEntries = await Promise.all(
    relevantAllocations.map(async (allocation) => {
        const choiceContext = await token.allocation.context.execute({
            allocationCid: allocation.contractId,
            registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
        })

        return {
            legId: allocation.interfaceViewValue.allocation.transferLegId,
            cid: allocation.contractId,
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

const allocationsWithContext: OTCTrade_Settle['allocationsWithContext'] =
    Object.fromEntries(
        allocationEntries.map((entry) => [
            entry.legId,
            {
                _1: entry.cid as OTCTrade_Settle['allocationsWithContext'][string]['_1'],
                _2: entry.extraArgs,
            },
        ])
    )

const uniqueDisclosedContracts = Array.from(
    new Map(
        allocationEntries
            .flatMap((entry) => entry.disclosedContracts)
            .map((contract) => [contract.contractId, contract])
    ).values()
)

await sdk.ledger
    .prepare({
        partyId: venue.partyId,
        commands: [
            {
                ExerciseCommand: {
                    templateId: OTCTrade.templateId,
                    contractId: otcTrade.contractId,
                    choice: OTCTrade.OTCTrade_Settle.choiceName,
                    choiceArgument: { allocationsWithContext },
                },
            },
        ],
        disclosedContracts: uniqueDisclosedContracts,
    })
    .sign(venue.keyPair.privateKey)
    .execute({ partyId: venue.partyId })

logger.info('Venue settled OTCTrade')

await token.utxos.list({ partyId: alice.partyId }).then((transactions) => {
    logger.info(transactions, 'Token Standard Holding Transactions (Alice):')
})

await token.utxos.list({ partyId: bob.partyId }).then((transactions) => {
    logger.info(transactions, 'Token Standard Holding Transactions (Bob):')
})
