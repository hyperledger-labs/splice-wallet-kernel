import pino from 'pino'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import {
    localNetStaticConfig,
    SDK,
    signTransactionHash,
} from '@canton-network/wallet-sdk'
import { KeyPair } from '@canton-network/core-signing-lib'
import { GenerateTransactionResponse } from '@canton-network/core-ledger-client'
import {
    TOKEN_NAMESPACE_CONFIG,
    TOKEN_PROVIDER_CONFIG_DEFAULT,
    AMULET_NAMESPACE_CONFIG,
    ASSET_CONFIG,
    getActiveContractCid,
} from './utils/index.js'
import type { LedgerTypes } from '@canton-network/wallet-sdk'

const logger = pino({ name: 'v1-15-multi-sync-trade', level: 'info' })

type PartyInfo = Omit<GenerateTransactionResponse, 'topologyTransactions'> & {
    topologyTransactions?: string[] | undefined
    keyPair: KeyPair
}

// ══════════════════════════════════════════════════════════
// Multi-Synchronizer DvP Workflow
// ══════════════════════════════════════════════════════════
//
// This example implements the DvP (Delivery vs Payment) flow
// from slide 15: "Example: token using private synchronizer"
//
// Participants:
//   Canton Coin app  (green  = Global Synchronizer) — Amulet instrument
//   Token app        (blue   = Private Synchronizer) — Token instrument
//   Alice wallet UI  — holds Amulet, receives Token
//   Bob wallet UI    — holds Token,  receives Amulet
//   Trading app      — orchestrates the OTC trade
//
// Flow:
//   init:  create AmuletRules (global), create Amulet for Alice
//   init:  create TokenRules  (private), create Token for Bob
//   (1)  Trading app: create Trade → AllocationRequests displayed
//   (2)  Alice: exercise AllocationFactory_Allocate → AmuletAllocation (global)
//   (3)  Bob:   exercise AllocationFactory_Allocate → TokenAllocation  (private)
//   (4)  Trading app: exercise Trade_Settle
//          • reassign TokenAllocation (private → global)
//          • exercise Allocation_Transfer for both legs
//          → Amulet created for Bob (global)
//          → Token created for Alice (global, then reassigned to private)
//   later: exercise TransferFactory_Transfer → reassign to private sync
//
// ══════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────
// 1. SDK Initialization
// ──────────────────────────────────────────────────────────

const sdk = await SDK.create({
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
})

const token = await sdk.token(TOKEN_NAMESPACE_CONFIG)
const amulet = await sdk.amulet(AMULET_NAMESPACE_CONFIG)
const asset = await sdk.asset(ASSET_CONFIG)

// ──────────────────────────────────────────────────────────
// 2. Discover Connected Synchronizers (global + private)
// ──────────────────────────────────────────────────────────

const connectedSyncResponse = await sdk.ledger.state.connectedSynchronizers({})

if (
    !connectedSyncResponse.connectedSynchronizers ||
    connectedSyncResponse.connectedSynchronizers.length === 0
) {
    throw new Error('No connected synchronizers found')
}

const allSynchronizers = connectedSyncResponse.connectedSynchronizers

logger.info(
    `Connected synchronizers: ${allSynchronizers
        .map((s: LedgerTypes['ConnectedSynchronizer']) => s.synchronizerAlias)
        .join(', ')}`
)

const globalSynchronizer = allSynchronizers.find(
    (s: LedgerTypes['ConnectedSynchronizer']) =>
        s.synchronizerAlias === 'global'
)
const appSynchronizer = allSynchronizers.find(
    (s: LedgerTypes['ConnectedSynchronizer']) =>
        s.synchronizerAlias === 'app-synchronizer'
)

const globalSynchronizerId = globalSynchronizer?.synchronizerId
const appSynchronizerId = appSynchronizer?.synchronizerId

if (!globalSynchronizerId)
    throw new Error('Global synchronizer not found (alias: "global")')
if (!appSynchronizerId)
    throw new Error(
        'App synchronizer not found (alias: "app-synchronizer"). ' +
            'Start localnet with --multi-sync to enable it.'
    )

logger.info(
    `Synchronizer IDs — global: ${globalSynchronizerId}, app: ${appSynchronizerId}`
)

// ──────────────────────────────────────────────────────────
// 2b. Upload Required DARs
//
// These DARs are NOT automatically uploaded during localnet
// startup. They must be downloaded from the
// token-standard-v2-upcoming branch of the splice repo and
// placed in .localnet/dars/ before running this script.
// See 15-multi-sync-trade.md for instructions.
// ──────────────────────────────────────────────────────────

const PATH_TO_LOCALNET = '../../../../.localnet'
const here = path.dirname(fileURLToPath(import.meta.url))

// Upload splice-token-test-trading-app-v2-1.0.0.dar
const TRADING_APP_V2_DAR = '/dars/splice-token-test-trading-app-v2-1.0.0.dar'
const TRADING_APP_V2_PACKAGE_ID =
    '352e2ac9b1f0819cc526a061bbdbf4317b5f1c4e15fa4478baa539a263d404bd'

const tradingAppV2DarPath = path.join(
    here,
    PATH_TO_LOCALNET,
    TRADING_APP_V2_DAR
)
const tradingAppV2DarBytes = await fs.readFile(tradingAppV2DarPath)
await sdk.ledger.dar.upload(tradingAppV2DarBytes, TRADING_APP_V2_PACKAGE_ID)
logger.info('Uploaded DAR: splice-token-test-trading-app-v2-1.0.0.dar')

// Upload splice-test-token-v1-1.0.0.dar
const TEST_TOKEN_V1_DAR = '/dars/splice-test-token-v1-1.0.0.dar'
const TEST_TOKEN_V1_PACKAGE_ID =
    'ac2ed8e38a081e8a4aaf065f476820f682522e1157ce85a8ff0ce45d81154e0c'

const testTokenV1DarPath = path.join(here, PATH_TO_LOCALNET, TEST_TOKEN_V1_DAR)
const testTokenV1DarBytes = await fs.readFile(testTokenV1DarPath)
await sdk.ledger.dar.upload(testTokenV1DarBytes, TEST_TOKEN_V1_PACKAGE_ID)
logger.info('Uploaded DAR: splice-test-token-v1-1.0.0.dar')

logger.info('All required DARs uploaded successfully')

// ──────────────────────────────────────────────────────────
// 2c. Vet DARs on the App Synchronizer
//
//     DARs uploaded via sdk.ledger.dar.upload() are only
//     vetted on the default (global) synchronizer. To use
//     them on the app-synchronizer, we re-upload (vet) via
//     the raw /v2/packages endpoint with the app-sync ID.
//     The actual bytes are already stored; this just adds
//     the vetting topology for the app-synchronizer.
// ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sdkCtx = (sdk.ledger as any).sdkContext

for (const [darLabel, darBytes] of [
    ['splice-token-test-trading-app-v2', tradingAppV2DarBytes],
    ['splice-test-token-v1', testTokenV1DarBytes],
] as const) {
    await sdkCtx.ledgerProvider.request({
        method: 'ledgerApi',
        params: {
            resource: '/v2/packages',
            requestMethod: 'post',
            query: {
                synchronizerId: appSynchronizerId,
                vetAllPackages: true,
            },
            body: darBytes,
            headers: { 'Content-Type': 'application/octet-stream' },
        },
    })
    logger.info(`Vetted ${darLabel} on app-synchronizer`)
}

// ──────────────────────────────────────────────────────────
// 3. Allocate Parties (Alice, Bob, Trading App)
// ──────────────────────────────────────────────────────────

const allocatedParties = await Promise.all(
    ['v1-15-alice', 'v1-15-bob', 'v1-15-trading-app'].map(async (partyHint) => {
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

const alice = partyInfo.get('v1-15-alice')!
const bob = partyInfo.get('v1-15-bob')!
const tradingApp = partyInfo.get('v1-15-trading-app')!

logger.info(
    `Parties allocated — alice: ${alice.partyId}, bob: ${bob.partyId}, tradingApp: ${tradingApp.partyId}`
)

// ──────────────────────────────────────────────────────────
// 3b. Register parties on the App Synchronizer
//
//     Parties were allocated on the global synchronizer (default).
//     To create Token contracts on the app-synchronizer, the
//     relevant parties must also be registered there.
//     We call generate-topology + allocate for each party on
//     the second synchronizer.
// ──────────────────────────────────────────────────────────

for (const [label, info] of [
    ['bob', bob],
    ['alice', alice],
    ['tradingApp', tradingApp],
] as const) {
    // Generate topology for the app-synchronizer
    const topoResponse = await sdkCtx.ledgerProvider.request({
        method: 'ledgerApi',
        params: {
            resource: '/v2/parties/external/generate-topology',
            requestMethod: 'post',
            body: {
                synchronizer: appSynchronizerId,
                partyHint: info.partyId.split('::')[0],
                publicKey: {
                    format: 'CRYPTO_KEY_FORMAT_RAW',
                    keyData: info.keyPair.publicKey,
                    keySpec: 'SIGNING_KEY_SPEC_EC_CURVE25519',
                },
                localParticipantObservationOnly: false,
                confirmationThreshold: 1,
                otherConfirmingParticipantUids: [],
                observingParticipantUids: [],
            },
        },
    })

    // Sign the topology multi-hash
    const topoSignature = signTransactionHash(
        topoResponse.multiHash,
        info.keyPair.privateKey
    )

    // Allocate on the app-synchronizer
    await sdkCtx.ledgerProvider.request({
        method: 'ledgerApi',
        params: {
            resource: '/v2/parties/external/allocate',
            requestMethod: 'post',
            body: {
                synchronizer: appSynchronizerId,
                identityProviderId: '',
                onboardingTransactions: topoResponse.topologyTransactions.map(
                    (transaction: string) => ({ transaction })
                ),
                multiHashSignatures: [
                    {
                        format: 'SIGNATURE_FORMAT_CONCAT',
                        signature: topoSignature,
                        signedBy: info.publicKeyFingerprint,
                        signingAlgorithmSpec: 'SIGNING_ALGORITHM_SPEC_ED25519',
                    },
                ],
            },
        },
    })

    logger.info(`${label}: registered on app-synchronizer`)
}

// ──────────────────────────────────────────────────────────
// 4. Discover Amulet Asset
// ──────────────────────────────────────────────────────────

const amuletAsset = await asset.find(
    'Amulet',
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)

logger.info(`Amulet asset discovered — admin: ${amuletAsset.admin}`)

// ──────────────────────────────────────────────────────────
// 5. Mint Amulets for Alice
// ──────────────────────────────────────────────────────────

const [amuletTapCmdAlice, amuletTapDisclosedAlice] = await amulet.tap(
    alice.partyId,
    '2000000'
)

await sdk.ledger
    .prepare({
        partyId: alice.partyId,
        commands: amuletTapCmdAlice,
        disclosedContracts: amuletTapDisclosedAlice,
    })
    .sign(alice.keyPair.privateKey)
    .execute({ partyId: alice.partyId })

logger.info('Alice: Amulet holding minted (2,000,000)')

// ──────────────────────────────────────────────────────────
// 6a. Create TokenRules on the App (private) Synchronizer
//
//     The TokenRules contract implements TransferFactory and
//     AllocationFactory interfaces from the token standard.
//     It is needed for allocation during trade settlement.
//     Token and TokenRules live on the private/app synchronizer.
// ──────────────────────────────────────────────────────────

const TEST_TOKEN_TEMPLATE_PREFIX =
    '#splice-test-token-v1:Splice.Testing.Tokens.TestTokenV1'

const createTokenRulesCmd = {
    CreateCommand: {
        templateId: `${TEST_TOKEN_TEMPLATE_PREFIX}:TokenRules`,
        createArguments: {
            admin: bob.partyId,
        },
    },
}

await sdk.ledger
    .prepare({
        partyId: bob.partyId,
        commands: createTokenRulesCmd,
        disclosedContracts: [],
        synchronizerId: appSynchronizerId,
    })
    .sign(bob.keyPair.privateKey)
    .execute({ partyId: bob.partyId })

logger.info('TokenRules created by Bob (on app-synchronizer)')

// ──────────────────────────────────────────────────────────
// 6b. Mint Token holding for Bob on the App (private) Synchronizer
//
//     Bob is both the owner and the instrumentId.admin of
//     the Token, so he is the sole signatory and a simple
//     single-party prepare/sign/execute is sufficient.
//     The Token holding lives on the app-synchronizer.
// ──────────────────────────────────────────────────────────

const createTokenCmd = {
    CreateCommand: {
        templateId: `${TEST_TOKEN_TEMPLATE_PREFIX}:Token`,
        createArguments: {
            holding: {
                owner: bob.partyId,
                instrumentId: {
                    admin: bob.partyId,
                    id: 'TestToken',
                },
                amount: '500',
                lock: null,
                meta: { values: {} },
            },
        },
    },
}

await sdk.ledger
    .prepare({
        partyId: bob.partyId,
        commands: createTokenCmd,
        disclosedContracts: [],
        synchronizerId: appSynchronizerId,
    })
    .sign(bob.keyPair.privateKey)
    .execute({ partyId: bob.partyId })

logger.info('Bob: Token holding minted (500 TestToken, on app-synchronizer)')

// ──────────────────────────────────────────────────────────
// 7. Create Trade (OTCTradeProposal) between Alice and Bob
//
//    Leg 0 (Amulet leg): Alice sends 100 Amulet to Bob
//    Leg 1 (Token leg):  Bob sends 20 Token to Alice
//
//    Uses the splice-token-test-trading-app-v2 DAR.
// ──────────────────────────────────────────────────────────

const TRADING_APP_V2_TEMPLATE_PREFIX =
    '#splice-token-test-trading-app-v2:Splice.Testing.Apps.TradingAppV2'

const transferLegs = [
    {
        transferLegId: 'leg-0',
        sender: { owner: alice.partyId, id: 'default', provider: null },
        receiver: { owner: bob.partyId, id: 'default', provider: null },
        amount: '100',
        instrumentId: { admin: amuletAsset.admin, id: 'Amulet' },
        meta: { values: {} },
    },
    {
        transferLegId: 'leg-1',
        sender: { owner: bob.partyId, id: 'default', provider: null },
        receiver: { owner: alice.partyId, id: 'default', provider: null },
        amount: '20',
        instrumentId: { admin: bob.partyId, id: 'TestToken' },
        meta: { values: {} },
    },
]

const now = new Date().toISOString()
const settleAt = new Date(Date.now() + 3600 * 1000).toISOString()

const createTrade = {
    CreateCommand: {
        templateId: `${TRADING_APP_V2_TEMPLATE_PREFIX}:OTCTrade`,
        createArguments: {
            venue: tradingApp.partyId,
            transferLegs,
            createdAt: now,
            settleAt,
            settlementDeadline: null,
            autoReceiptAuthorizers: [],
        },
    },
}

await sdk.ledger
    .prepare({
        partyId: tradingApp.partyId,
        commands: createTrade,
        disclosedContracts: [],
    })
    .sign(tradingApp.keyPair.privateKey)
    .execute({ partyId: tradingApp.partyId })

logger.info(
    'OTCTrade created by Trading App:\n' +
        '    • Leg 0: Alice → Bob (100 Amulet)\n' +
        '    • Leg 1: Bob → Alice (20 TestToken)'
)

// ──────────────────────────────────────────────────────────
// 8. Trading App: Request Allocations from OTCTrade
//
//    The venue exercises OTCTrade_RequestAllocations which
//    creates OTCTradeAllocationRequest contracts — one per
//    trading party. Each trader then sees the request and
//    responds by creating an allocation for their leg.
// ──────────────────────────────────────────────────────────

const otcTradeContracts = await sdk.ledger.acs.read({
    templateIds: [`${TRADING_APP_V2_TEMPLATE_PREFIX}:OTCTrade`],
    parties: [tradingApp.partyId],
    filterByParty: true,
})

const otcTradeCid = otcTradeContracts[0].contractId
if (!otcTradeCid) throw new Error('OTCTrade contract not found')

const requestAllocationsCmd = [
    {
        ExerciseCommand: {
            templateId: `${TRADING_APP_V2_TEMPLATE_PREFIX}:OTCTrade`,
            contractId: otcTradeCid,
            choice: 'OTCTrade_RequestAllocations',
            choiceArgument: {},
        },
    },
]

await sdk.ledger
    .prepare({
        partyId: tradingApp.partyId,
        commands: requestAllocationsCmd,
        disclosedContracts: [],
    })
    .sign(tradingApp.keyPair.privateKey)
    .execute({ partyId: tradingApp.partyId })

logger.info('Trading App: Allocation requests created')

// ──────────────────────────────────────────────────────────
// 9. Alice: Allocate Amulet for her leg (leg-0)
//
//    Alice reads her pending allocation requests, finds the
//    leg where she is the sender, and exercises
//    AllocationFactory_Allocate via the SDK high-level API.
//    The SDK automatically selects UTXOs and calls the
//    Amulet registry to resolve the AllocationFactory.
// ──────────────────────────────────────────────────────────

const pendingRequestsAlice = await token.allocation.request.pending(
    alice.partyId
)
const requestViewAlice = pendingRequestsAlice[0].interfaceViewValue!

const legIdAlice = Object.keys(requestViewAlice.transferLegs).find(
    (key) => requestViewAlice.transferLegs[key].sender === alice.partyId
)!
if (!legIdAlice) throw new Error('No transfer leg found for Alice')

const [allocCmdAlice, allocDisclosedAlice] =
    await token.allocation.instruction.create({
        allocationSpecification: {
            settlement: requestViewAlice.settlement,
            transferLegId: legIdAlice,
            transferLeg: requestViewAlice.transferLegs[legIdAlice],
        },
        asset: amuletAsset,
    })

await sdk.ledger
    .prepare({
        partyId: alice.partyId,
        commands: allocCmdAlice,
        disclosedContracts: allocDisclosedAlice,
    })
    .sign(alice.keyPair.privateKey)
    .execute({ partyId: alice.partyId })

logger.info('Alice: Amulet allocation created for leg-0')

// ──────────────────────────────────────────────────────────
// 10. Bob: Allocate TestToken for his leg (leg-1)
//
//     TestToken has no registry, so we manually exercise
//     AllocationFactory_Allocate on the TokenRules contract
//     (which implements the AllocationFactory interface).
// ──────────────────────────────────────────────────────────

const pendingRequestsBob = await token.allocation.request.pending(bob.partyId)
const requestViewBob = pendingRequestsBob[0].interfaceViewValue!

const legIdBob = Object.keys(requestViewBob.transferLegs).find(
    (key) => requestViewBob.transferLegs[key].sender === bob.partyId
)!
if (!legIdBob) throw new Error('No transfer leg found for Bob')

// Read Bob's Token holding CID and TokenRules CID from ACS
const tokenHoldings = await sdk.ledger.acs.read({
    templateIds: [`${TEST_TOKEN_TEMPLATE_PREFIX}:Token`],
    parties: [bob.partyId],
    filterByParty: true,
})
const tokenHoldingCid = tokenHoldings[0].contractId
if (!tokenHoldingCid) throw new Error('Token holding not found for Bob')

const tokenRulesContracts = await sdk.ledger.acs.read({
    templateIds: [`${TEST_TOKEN_TEMPLATE_PREFIX}:TokenRules`],
    parties: [bob.partyId],
    filterByParty: true,
})
const tokenRulesCid = tokenRulesContracts[0].contractId
if (!tokenRulesCid) throw new Error('TokenRules contract not found')

const ALLOCATION_FACTORY_INTERFACE_ID =
    '#splice-api-token-allocation-instruction-v1:Splice.Api.Token.AllocationInstructionV1:AllocationFactory'

const allocateBobCmd = [
    {
        ExerciseCommand: {
            templateId: ALLOCATION_FACTORY_INTERFACE_ID,
            contractId: tokenRulesCid,
            choice: 'AllocationFactory_Allocate',
            choiceArgument: {
                expectedAdmin: bob.partyId,
                allocation: {
                    settlement: requestViewBob.settlement,
                    transferLegId: legIdBob,
                    transferLeg: requestViewBob.transferLegs[legIdBob],
                },
                requestedAt: new Date().toISOString(),
                inputHoldingCids: [tokenHoldingCid],
                extraArgs: {
                    context: { values: {} },
                    meta: { values: {} },
                },
            },
        },
    },
]

await sdk.ledger
    .prepare({
        partyId: bob.partyId,
        commands: allocateBobCmd,
        disclosedContracts: [],
        synchronizerId: appSynchronizerId,
    })
    .sign(bob.keyPair.privateKey)
    .execute({ partyId: bob.partyId })

logger.info('Bob: TestToken allocation created for leg-1 (on app-synchronizer)')

// ──────────────────────────────────────────────────────────
// 10b. Reassign Bob's TokenAllocation from app-synchronizer
//      to global synchronizer
//
//      The OTCTrade lives on the global synchronizer, but
//      Bob's TokenAllocation was created on the app-synchronizer
//      (because the Token holding lives there). Before
//      settlement can proceed, the allocation must be moved
//      to the global synchronizer.
//
//      Flow: unassign (app-sync) → assign (global)
// ──────────────────────────────────────────────────────────

const allocationsBobPreReassign = await token.allocation.pending(bob.partyId)
const bobTokenAllocationForReassign = allocationsBobPreReassign.find(
    (a) => a.interfaceViewValue.allocation.transferLegId === legIdBob
)
if (!bobTokenAllocationForReassign)
    throw new Error("Bob's TokenAllocation not found for reassignment")

const bobAllocationCid = bobTokenAllocationForReassign.contractId

logger.info(
    `Reassigning Bob's TokenAllocation: app-synchronizer → global\n` +
        `    contractId: ${bobAllocationCid}\n` +
        `    source: ${appSynchronizerId}\n` +
        `    target: ${globalSynchronizerId}`
)

// Step 1: Unassign from app-synchronizer
// Pass eventFormat so the response includes the JsUnassignedEvent
// with the reassignmentId needed for the assign step.
const unassignResult = await sdk.contracts.unassignContract({
    contractId: bobAllocationCid,
    source: appSynchronizerId,
    target: globalSynchronizerId,
    submitter: bob.partyId,
    eventFormat: {
        filtersByParty: { [bob.partyId]: {} },
    },
})

// Extract reassignmentId from the unassign event
const unassignEvent = unassignResult?.reassignment?.events?.[0]
const reassignmentId =
    unassignEvent && 'JsUnassignedEvent' in unassignEvent
        ? unassignEvent.JsUnassignedEvent.value.reassignmentId
        : undefined

if (!reassignmentId) {
    throw new Error('Could not extract reassignmentId from unassign response')
}

logger.info(`Unassign completed — reassignmentId: ${reassignmentId}`)

// Step 2: Assign to global synchronizer
await sdk.contracts.assignContract({
    reassignmentId,
    source: appSynchronizerId,
    target: globalSynchronizerId,
    submitter: bob.partyId,
})

logger.info(
    "Bob's TokenAllocation reassigned from app-synchronizer → global synchronizer"
)

// ──────────────────────────────────────────────────────────
// 11. Trading App: Settle the OTCTrade
//
//     Collects allocations from both parties, gets choice
//     context for the Amulet allocation from the registry,
//     and exercises OTCTrade_Settle with SettlementBatchV1
//     for each instrument admin.
//
//     OTCTrade_Settle internally exercises Allocation_ExecuteTransfer
//     for each allocation, which:
//       • Transfers 100 Amulet from Alice to Bob (new Amulet contract)
//       • Transfers 20 TestToken from Bob to Alice (new Token contract)
//
//     V1 settlement requires sender+receiver authority for
//     Allocation_ExecuteTransfer, so Alice and Bob are added
//     as extraSettlementAuthorizers (multi-party signing).
// ──────────────────────────────────────────────────────────

// Read allocations for each party
const allocationsAlice = await token.allocation.pending(alice.partyId)
const amuletAllocation = allocationsAlice.find(
    (a) => a.interfaceViewValue.allocation.transferLegId === legIdAlice
)
if (!amuletAllocation) throw new Error('Amulet allocation not found')

// Bob's allocation was reassigned from app-sync → global in step 10b.
// Use the contract ID captured before reassignment (it doesn't change).
const testTokenAllocationCid = bobAllocationCid

// Get choice context for Amulet allocation (from registry)
const amuletAllocContext = await token.allocation.context.execute({
    allocationCid: amuletAllocation.contractId,
    registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
})

// Read allocation request CIDs to archive during settlement
const allocationRequestContracts = await sdk.ledger.acs.read({
    templateIds: [
        `${TRADING_APP_V2_TEMPLATE_PREFIX}:OTCTradeAllocationRequest`,
    ],
    parties: [tradingApp.partyId],
    filterByParty: true,
})
const allocationRequestCids = allocationRequestContracts.map(
    (c) => c.contractId
)

// Build SettlementBatchV1 per instrument admin
// Map.Map in Daml JSON is encoded as [[key, value], ...]
const batchesByAdmin = [
    [
        amuletAsset.admin,
        {
            tag: 'SettlementBatchV1',
            value: {
                allocationsWithContext: {
                    [legIdAlice]: {
                        _1: amuletAllocation.contractId,
                        _2: {
                            context: {
                                values:
                                    amuletAllocContext.choiceContextData
                                        ?.values ?? {},
                            },
                            meta: { values: {} },
                        },
                    },
                },
            },
        },
    ],
    [
        bob.partyId,
        {
            tag: 'SettlementBatchV1',
            value: {
                allocationsWithContext: {
                    [legIdBob]: {
                        _1: testTokenAllocationCid,
                        _2: {
                            context: { values: {} },
                            meta: { values: {} },
                        },
                    },
                },
            },
        },
    ],
]

const settleCmd = [
    {
        ExerciseCommand: {
            templateId: `${TRADING_APP_V2_TEMPLATE_PREFIX}:OTCTrade`,
            contractId: otcTradeCid,
            choice: 'OTCTrade_Settle',
            choiceArgument: {
                batchesByAdmin,
                allocationRequests: allocationRequestCids,
                extraSettlementAuthorizers: [alice.partyId, bob.partyId],
            },
        },
    },
]

// Multi-party signing: venue + alice + bob
const settlementDisclosedContracts = amuletAllocContext.disclosedContracts ?? []

const settlePrepareResult = await sdk.ledger.internal.prepare({
    commands: settleCmd,
    actAs: [tradingApp.partyId, alice.partyId, bob.partyId],
    disclosedContracts: settlementDisclosedContracts,
})

const settleTxHash = settlePrepareResult.preparedTransactionHash
const tradingAppSettleSig = signTransactionHash(
    settleTxHash,
    tradingApp.keyPair.privateKey
)
const aliceSettleSig = signTransactionHash(
    settleTxHash,
    alice.keyPair.privateKey
)
const bobSettleSig = signTransactionHash(settleTxHash, bob.keyPair.privateKey)

await sdkCtx.ledgerProvider.request({
    method: 'ledgerApi',
    params: {
        resource: '/v2/interactive-submission/executeAndWait',
        requestMethod: 'post',
        body: {
            userId: sdkCtx.userId,
            preparedTransaction: settlePrepareResult.preparedTransaction,
            hashingSchemeVersion: 'HASHING_SCHEME_VERSION_V2',
            submissionId: crypto.randomUUID(),
            deduplicationPeriod: { Empty: {} },
            partySignatures: {
                signatures: [
                    {
                        party: tradingApp.partyId,
                        signatures: [
                            {
                                signature: tradingAppSettleSig,
                                signedBy: tradingApp.partyId.split('::')[1],
                                format: 'SIGNATURE_FORMAT_CONCAT',
                                signingAlgorithmSpec:
                                    'SIGNING_ALGORITHM_SPEC_ED25519',
                            },
                        ],
                    },
                    {
                        party: alice.partyId,
                        signatures: [
                            {
                                signature: aliceSettleSig,
                                signedBy: alice.partyId.split('::')[1],
                                format: 'SIGNATURE_FORMAT_CONCAT',
                                signingAlgorithmSpec:
                                    'SIGNING_ALGORITHM_SPEC_ED25519',
                            },
                        ],
                    },
                    {
                        party: bob.partyId,
                        signatures: [
                            {
                                signature: bobSettleSig,
                                signedBy: bob.partyId.split('::')[1],
                                format: 'SIGNATURE_FORMAT_CONCAT',
                                signingAlgorithmSpec:
                                    'SIGNING_ALGORITHM_SPEC_ED25519',
                            },
                        ],
                    },
                ],
            },
        },
    },
})

logger.info(
    'Trading App: OTCTrade settled via Allocation_ExecuteTransfer:\n' +
        '    • Allocation_ExecuteTransfer (leg-0): 100 Amulet transferred Alice → Bob (new Amulet contract)\n' +
        '    • Allocation_ExecuteTransfer (leg-1): 20 TestToken transferred Bob → Alice (new Token contract)'
)

// ──────────────────────────────────────────────────────────
// 12. Alice: Transfer Token to app (private) synchronizer
//
//     After settlement Alice holds 20 TestToken on the
//     global synchronizer. We first reassign the Token to
//     the app-synchronizer (where the TokenRules / Transfer-
//     Factory lives), then exercise TransferFactory_Transfer
//     as a self-transfer (Alice → Alice) so the resulting
//     Token contract is created on the app-synchronizer.
//
//     We build the exercise command manually because the
//     registry doesn't know about custom TestToken — only
//     registered instruments have choice context there.
// ──────────────────────────────────────────────────────────

// Find Alice's Token holding (received from settlement)
const aliceTokenHoldings = await sdk.ledger.acs.read({
    templateIds: [`${TEST_TOKEN_TEMPLATE_PREFIX}:Token`],
    parties: [alice.partyId],
    filterByParty: true,
})
const aliceTokenHoldingCid = aliceTokenHoldings[0]?.contractId
if (!aliceTokenHoldingCid)
    throw new Error('Token holding not found for Alice after settlement')

// Step 12a: Reassign Alice's Token from global → app-synchronizer
const aliceUnassignResult = await sdk.contracts.unassignContract({
    contractId: aliceTokenHoldingCid,
    source: globalSynchronizerId,
    target: appSynchronizerId,
    submitter: alice.partyId,
    eventFormat: {
        filtersByParty: { [alice.partyId]: {} },
    },
})

const aliceUnassignEvent = aliceUnassignResult?.reassignment?.events?.[0]
const aliceReassignmentId =
    aliceUnassignEvent && 'JsUnassignedEvent' in aliceUnassignEvent
        ? aliceUnassignEvent.JsUnassignedEvent.value.reassignmentId
        : undefined

if (!aliceReassignmentId) {
    throw new Error(
        'Could not extract reassignmentId from Alice Token unassign response'
    )
}

await sdk.contracts.assignContract({
    reassignmentId: aliceReassignmentId,
    source: globalSynchronizerId,
    target: appSynchronizerId,
    submitter: alice.partyId,
})

logger.info("Alice's Token reassigned from global → app-synchronizer")

// Step 12b: Exercise TransferFactory_Transfer (self-transfer on app-synchronizer)
//
// Alice needs readAs: [bob.partyId] to see the TokenRules contract
// (Bob is the admin/signatory). The public sdk.ledger.prepare doesn't
// support readAs, so we use the internal prepare + raw execute.
const TRANSFER_FACTORY_INTERFACE_ID =
    '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferFactory'

const transferExercise = {
    templateId: TRANSFER_FACTORY_INTERFACE_ID,
    contractId: tokenRulesCid,
    choice: 'TransferFactory_Transfer',
    choiceArgument: {
        expectedAdmin: bob.partyId,
        transfer: {
            sender: alice.partyId,
            receiver: alice.partyId, // self-transfer
            amount: '20',
            instrumentId: { admin: bob.partyId, id: 'TestToken' },
            requestedAt: new Date(Date.now() - 60_000).toISOString(),
            executeBefore: new Date(
                Date.now() + 24 * 60 * 60 * 1000
            ).toISOString(),
            inputHoldingCids: [aliceTokenHoldingCid],
            meta: { values: {} },
        },
        extraArgs: {
            context: { values: {} },
            meta: { values: {} },
        },
    },
}

const transferPrepareResult = await sdk.ledger.internal.prepare({
    commands: [{ ExerciseCommand: transferExercise }],
    actAs: [alice.partyId, bob.partyId],
    readAs: [bob.partyId],
    disclosedContracts: [],
})

const transferTxHash = transferPrepareResult.preparedTransactionHash
if (!transferTxHash) throw new Error('Transfer prepare returned no hash')

const aliceTransferSig = signTransactionHash(
    transferTxHash,
    alice.keyPair.privateKey
)
const bobTransferSig = signTransactionHash(
    transferTxHash,
    bob.keyPair.privateKey
)

await sdkCtx.ledgerProvider.request({
    method: 'ledgerApi',
    params: {
        resource: '/v2/interactive-submission/executeAndWait',
        requestMethod: 'post',
        body: {
            userId: sdkCtx.userId,
            preparedTransaction: transferPrepareResult.preparedTransaction,
            hashingSchemeVersion: 'HASHING_SCHEME_VERSION_V2',
            submissionId: crypto.randomUUID(),
            deduplicationPeriod: { Empty: {} },
            partySignatures: {
                signatures: [
                    {
                        party: alice.partyId,
                        signatures: [
                            {
                                signature: aliceTransferSig,
                                signedBy: alice.partyId.split('::')[1],
                                format: 'SIGNATURE_FORMAT_CONCAT',
                                signingAlgorithmSpec:
                                    'SIGNING_ALGORITHM_SPEC_ED25519',
                            },
                        ],
                    },
                    {
                        party: bob.partyId,
                        signatures: [
                            {
                                signature: bobTransferSig,
                                signedBy: bob.partyId.split('::')[1],
                                format: 'SIGNATURE_FORMAT_CONCAT',
                                signingAlgorithmSpec:
                                    'SIGNING_ALGORITHM_SPEC_ED25519',
                            },
                        ],
                    },
                ],
            },
        },
    },
})

logger.info(
    'Alice: TestToken self-transferred on app-synchronizer via TransferFactory_Transfer'
)

/*
// In a multi-sync setup: first synchronizer is the global (Amulet/decentralized) synchronizer,
// second is the private synchronizer for Token instruments.
const globalSynchronizerId = allSynchronizers[0]
const privateSynchronizerId =
    allSynchronizers.length > 1 ? allSynchronizers[1] : undefined

if (!privateSynchronizerId) {
    logger.warn(
        'Only one synchronizer found. Multi-synchronizer reassignment steps will be skipped. ' +
            'Start localnet with --profile multi-sync to enable a second synchronizer.'
    )
}

logger.info(
    `Synchronizer mapping — global: ${globalSynchronizerId}, private: ${privateSynchronizerId ?? '(none)'}`
)

// ──────────────────────────────────────────────────────────
// 3. Upload Trading DAR
// ──────────────────────────────────────────────────────────

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
logger.info('Trading DAR uploaded')

// ──────────────────────────────────────────────────────────
// 3b. Upload Token App DAR (private synchronizer instrument)
//
// STUB: The Token app DAR (containing TokenRules, Token
// holding templates, TokenAllocation, etc.) does not yet
// exist in the codebase. When available:
//
//   const TOKEN_APP_DAR_PATH = '/dars/token-app-1.0.0.dar'
//   const TOKEN_APP_PACKAGE_ID = '<package-id-of-token-app>'
//   const tokenDarPath = path.join(here, PATH_TO_LOCALNET, TOKEN_APP_DAR_PATH)
//   const tokenDarBytes = await fs.readFile(tokenDarPath)
//   await sdk.ledger.dar.upload(tokenDarBytes, TOKEN_APP_PACKAGE_ID)
//   logger.info('Token App DAR uploaded')
//
// The Token App DAML would need at minimum:
//   - template TokenRules (signatory: tokenAdmin)
//       choice TokenRules_Mint : ContractId Token
//   - template Token (implements Holding interface)
//       with owner, instrumentId, amount, ...
//   - template TokenAllocation (implements Allocation interface)
//       choice Allocation_ExecuteTransfer
// ──────────────────────────────────────────────────────────

logger.info(
    'Token App DAR upload: STUB — Token app DAR not yet available. ' +
        'Using Amulet instrument as stand-in for Token leg.'
)

// ──────────────────────────────────────────────────────────
// 4. Allocate Parties (Alice, Bob, Trading App)
//    - Alice holds Amulet on the global synchronizer
//    - Bob holds Token on the private synchronizer
//    - Trading App orchestrates the trade
// ──────────────────────────────────────────────────────────

const allocatedParties = await Promise.all(
    ['v1-13-alice', 'v1-13-bob', 'v1-13-trading-app'].map(async (partyHint) => {
        const partyKeys = sdk.keys.generate()
        const party = await sdk.party.external
            .create(partyKeys.publicKey, {
                partyHint,
                synchronizerId: globalSynchronizerId,
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

const alice = partyInfo.get('v1-13-alice')!
const bob = partyInfo.get('v1-13-bob')!
const tradingApp = partyInfo.get('v1-13-trading-app')!

logger.info(
    `Parties allocated — alice: ${alice.partyId}, bob: ${bob.partyId}, tradingApp: ${tradingApp.partyId}`
)

// ──────────────────────────────────────────────────────────
// 5. Initialize Amulet Rules (on global synchronizer)
//    The amulet namespace already fetches AmuletRules from
//    the global synchronizer via ScanProxyClient.
// ──────────────────────────────────────────────────────────

const amuletAsset = await asset.find(
    'Amulet',
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)

logger.info(
    `Amulet Rules initialized (global synchronizer) — admin: ${amuletAsset.admin}`
)

// Mint Amulet for Alice on global synchronizer
const [amuletTapCmdAlice, amuletTapDisclosedAlice] = await amulet.tap(
    alice.partyId,
    '2000000'
)

const globalSyncFromDisclosed = amuletTapDisclosedAlice[0]?.synchronizerId

await sdk.ledger
    .prepare({
        partyId: alice.partyId,
        commands: amuletTapCmdAlice,
        disclosedContracts: amuletTapDisclosedAlice,
        ...(globalSyncFromDisclosed && {
            synchronizerId: globalSyncFromDisclosed,
        }),
    })
    .sign(alice.keyPair.privateKey)
    .execute({ partyId: alice.partyId })

logger.info('Alice: Amulet holding minted on global synchronizer')

// ──────────────────────────────────────────────────────────
// 6. Initialize Token Rules + mint Token for Bob
//    (Token app — private synchronizer)
//
// STUB: The Token app (TokenRules + Token minting) on the
// private synchronizer is not yet implemented. When the
// Token app DAML and its registry are available, this step
// would look like:
//
//   // Discover Token asset from private sync registry
//   const TOKEN_REGISTRY_URL = '<private-sync-registry-url>'
//   const tokenAsset = await asset.find('Token', new URL(TOKEN_REGISTRY_URL))
//
//   // Create TokenRules on private synchronizer
//   // (done by token admin during init, analogous to AmuletRules)
//   const createTokenRulesCmd = {
//       CreateCommand: {
//           templateId: '#token-app:TokenApp:TokenRules',
//           createArguments: {
//               admin: tokenAsset.admin,
//               // ... token rules configuration
//           },
//       },
//   }
//   await sdk.ledger
//       .prepare({
//           partyId: tokenAdmin,
//           commands: createTokenRulesCmd,
//           disclosedContracts: [],
//           synchronizerId: privateSynchronizerId,
//       })
//       .sign(tokenAdminKeys.privateKey)
//       .execute({ partyId: tokenAdmin })
//
//   // Mint Token for Bob on private synchronizer
//   const mintTokenCmd = {
//       ExerciseCommand: {
//           templateId: '#token-app:TokenApp:TokenRules',
//           contractId: tokenRulesCid,
//           choice: 'TokenRules_Mint',
//           choiceArgument: {
//               receiver: bob.partyId,
//               amount: '500',
//           },
//       },
//   }
//   await sdk.ledger
//       .prepare({
//           partyId: tokenAdmin,
//           commands: [mintTokenCmd],
//           disclosedContracts: [],
//           synchronizerId: privateSynchronizerId,
//       })
//       .sign(tokenAdminKeys.privateKey)
//       .execute({ partyId: tokenAdmin })
//
// For now, we mint Amulet for Bob on global sync as a stand-in.
// ──────────────────────────────────────────────────────────

logger.info(
    'Token Rules initialization + Token mint for Bob: STUB — ' +
        'Token app not yet available. Minting Amulet for Bob on global sync as stand-in.'
)

// Stand-in: Mint Amulet for Bob (replace with Token mint on private sync when available)
const [amuletTapCmdBob, amuletTapDisclosedBob] = await amulet.tap(
    bob.partyId,
    '2000000'
)

await sdk.ledger
    .prepare({
        partyId: bob.partyId,
        commands: amuletTapCmdBob,
        disclosedContracts: amuletTapDisclosedBob,
        ...(globalSyncFromDisclosed && {
            synchronizerId: globalSyncFromDisclosed,
        }),
    })
    .sign(bob.keyPair.privateKey)
    .execute({ partyId: bob.partyId })

logger.info(
    'Bob: holding minted (stand-in Amulet on global; should be Token on private)'
)

// ──────────────────────────────────────────────────────────
// 7. (1) Create OTCTradeProposal (Trading App creates Trade)
//
//    Leg 0 (Amulet leg): Alice sends 100 Amulet to Bob (global sync)
//    Leg 1 (Token leg):  Bob sends 20 Token to Alice  (private sync)
//
//    The Trading App creates the trade. Both Alice and Bob
//    see an AllocationRequest for their respective leg.
// ──────────────────────────────────────────────────────────

// STUB: When Token asset is available from private sync registry:
//   const tokenAsset = await asset.find('Token', new URL(TOKEN_REGISTRY_URL))
// For now, use amuletAsset as stand-in for the Token instrument.
const tokenAsset = amuletAsset // STUB: replace with real Token asset

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
        // STUB: When Token app is available, use Token instrument:
        //   instrumentId: { admin: tokenAsset.admin, id: 'Token' },
        instrumentId: { admin: tokenAsset.admin, id: 'Amulet' }, // stand-in
        meta: { values: {} },
    },
}

const createProposal = {
    CreateCommand: {
        templateId:
            '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
        createArguments: {
            venue: tradingApp.partyId,
            tradeCid: null,
            transferLegs,
            approvers: [alice.partyId],
        },
    },
}

await sdk.ledger
    .prepare({
        partyId: alice.partyId,
        commands: createProposal,
        disclosedContracts: [],
    })
    .sign(alice.keyPair.privateKey)
    .execute({ partyId: alice.partyId })

logger.info('(1) Trading App: OTCTradeProposal created by Alice')

// ──────────────────────────────────────────────────────────
// 8. Bob accepts OTCTradeProposal
//    (Both parties must approve before settlement can begin)
// ──────────────────────────────────────────────────────────

const activeTradeProposals = await sdk.ledger.acs.read({
    templateIds: [
        '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
    ],
    parties: [bob.partyId],
    filterByParty: true,
})

const otcpCid = getActiveContractCid(activeTradeProposals?.[0]?.contractEntry!)
if (!otcpCid) throw new Error('Unexpected lack of OTCTradeProposal contract')

const acceptCmd = [
    {
        ExerciseCommand: {
            templateId:
                '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
            contractId: otcpCid,
            choice: 'OTCTradeProposal_Accept',
            choiceArgument: { approver: bob.partyId },
        },
    },
]

await sdk.ledger
    .prepare({
        partyId: bob.partyId,
        commands: acceptCmd,
        disclosedContracts: [],
    })
    .sign(bob.keyPair.privateKey)
    .execute({ partyId: bob.partyId })

logger.info('Bob accepted OTCTradeProposal')

// ──────────────────────────────────────────────────────────
// 9. Trading App initiates settlement → creates OTCTrade
//    This triggers AllocationRequest contracts to appear
//    for both Alice and Bob.
// ──────────────────────────────────────────────────────────

const activeTradeProposals2 = await sdk.ledger.acs.read({
    templateIds: [
        '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
    ],
    parties: [tradingApp.partyId],
    filterByParty: true,
})

const now = new Date()
const prepareUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
const settleBefore = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()

const otcpCid2 = getActiveContractCid(
    activeTradeProposals2?.[0]?.contractEntry!
)
if (!otcpCid2) throw new Error('OTCTradeProposal not found for Trading App')

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

await sdk.ledger
    .prepare({
        partyId: tradingApp.partyId,
        commands: initiateSettlementCmd,
        disclosedContracts: [],
    })
    .sign(tradingApp.keyPair.privateKey)
    .execute({ partyId: tradingApp.partyId })

logger.info('Trading App initiated settlement → OTCTrade created')

const otcTrades = await sdk.ledger.acs.read({
    templateIds: [
        '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTrade',
    ],
    parties: [tradingApp.partyId],
    filterByParty: true,
})

const otcTradeCid = getActiveContractCid(otcTrades?.[0]?.contractEntry!)
if (!otcTradeCid) throw new Error('OTCTrade not found for Trading App')

logger.info(`OTCTrade created — cid: ${otcTradeCid}`)

// ──────────────────────────────────────────────────────────
// 10. (2) Alice: exercise AllocationFactory_Allocate
//     Creates an AmuletAllocation on the GLOBAL synchronizer
//
//     Alice's AllocationRequest asks her to lock 100 Amulet.
//     The resulting AmuletAllocation lives on the global sync
//     (same sync as Alice's Amulet holding).
// ──────────────────────────────────────────────────────────

const pendingAllocationRequestsAlice = await token.allocation.request.pending(
    alice.partyId
)

const allocationRequestViewAlice =
    pendingAllocationRequestsAlice?.[0].interfaceViewValue!

const legIdAlice = Object.keys(allocationRequestViewAlice.transferLegs).find(
    (key) =>
        allocationRequestViewAlice.transferLegs[key].sender === alice.partyId
)!
if (!legIdAlice) throw new Error('No leg found for Alice')

const legAlice = allocationRequestViewAlice.transferLegs[legIdAlice]

const specAlice = {
    settlement: allocationRequestViewAlice.settlement,
    transferLegId: legIdAlice,
    transferLeg: legAlice,
}

const [allocateCmdAlice, allocateDisclosedAlice] =
    await token.allocation.instruction.create({
        allocationSpecification: specAlice,
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

logger.info(
    '(2) Alice: AllocationFactory_Allocate exercised → AmuletAllocation created (global sync)'
)

// ──────────────────────────────────────────────────────────
// 11. (3) Bob: exercise AllocationFactory_Allocate
//     Creates a TokenAllocation on the PRIVATE synchronizer
//
//     Bob's AllocationRequest asks him to lock 20 Token.
//     The resulting TokenAllocation lives on the private sync
//     (same sync as Bob's Token holding).
//
// STUB: When Token app is available on the private sync,
// Bob would allocate against the Token asset on the private
// synchronizer. The allocation instruction would target the
// private sync's registry and produce a TokenAllocation:
//
//   const [allocateCmdBob, allocateDisclosedBob] =
//       await token.allocation.instruction.create({
//           allocationSpecification: specBob,
//           asset: tokenAsset,  // Token asset from private sync registry
//       })
//   await sdk.ledger
//       .prepare({
//           partyId: bob.partyId,
//           commands: allocateCmdBob,
//           disclosedContracts: allocateDisclosedBob,
//           synchronizerId: privateSynchronizerId,  // target private sync
//       })
//       .sign(bob.keyPair.privateKey)
//       .execute({ partyId: bob.partyId })
//
// For now, Bob allocates Amulet on global sync as stand-in.
// ──────────────────────────────────────────────────────────

const pendingAllocationRequestsBob = await token.allocation.request.pending(
    bob.partyId
)

const allocationRequestViewBob =
    pendingAllocationRequestsBob?.[0].interfaceViewValue!

const legIdBob = Object.keys(allocationRequestViewAlice.transferLegs).find(
    (key) => allocationRequestViewAlice.transferLegs[key].sender === bob.partyId
)!
if (!legIdBob) throw new Error('No leg found for Bob')

const legBob = allocationRequestViewAlice.transferLegs[legIdBob]

const specBob = {
    settlement: allocationRequestViewBob.settlement,
    transferLegId: legIdBob,
    transferLeg: legBob,
}

const [allocateCmdBob, allocateDisclosedBob] =
    await token.allocation.instruction.create({
        allocationSpecification: specBob,
        asset: amuletAsset, // STUB: replace with tokenAsset when Token app is available
    })

await sdk.ledger
    .prepare({
        partyId: bob.partyId,
        commands: allocateCmdBob,
        disclosedContracts: allocateDisclosedBob,
        // STUB: When Token app is on private sync, target private sync:
        //   synchronizerId: privateSynchronizerId,
    })
    .sign(bob.keyPair.privateKey)
    .execute({ partyId: bob.partyId })

logger.info(
    '(3) Bob: AllocationFactory_Allocate exercised → TokenAllocation created ' +
        '(should be on private sync; currently stand-in AmuletAllocation on global sync)'
)

// ──────────────────────────────────────────────────────────
// 12. Pre-settlement: Reassign Bob's TokenAllocation
//     from PRIVATE synchronizer → GLOBAL synchronizer
//
//     The Trade_Settle choice needs all allocations on the
//     same (global) synchronizer. Bob's TokenAllocation was
//     created on the private sync, so it must be reassigned
//     to the global sync before settlement can proceed.
//
//     Flow: unassign (private) → assign (global)
// ──────────────────────────────────────────────────────────

if (privateSynchronizerId) {
    const bobAllocations = await token.allocation.pending(bob.partyId)
    const bobAllocationCid = bobAllocations.find(
        (a) => a.interfaceViewValue.allocation.transferLegId === legIdBob
    )?.contractId

    if (bobAllocationCid) {
        logger.info(
            `Reassigning Bob's TokenAllocation: private → global synchronizer` +
                ` — contractId: ${bobAllocationCid}, source: ${privateSynchronizerId}, target: ${globalSynchronizerId}`
        )

        // Step 1: Unassign from private synchronizer
        const unassignResult = await sdk.contracts.unassignContract({
            contractId: bobAllocationCid,
            source: privateSynchronizerId,
            target: globalSynchronizerId,
            submitter: bob.partyId,
        })

        // Extract reassignmentId to complete the assign
        const unassignEvent = unassignResult?.reassignment?.events?.[0]
        const reassignmentId =
            unassignEvent && 'JsUnassignedEvent' in unassignEvent
                ? unassignEvent.JsUnassignedEvent.value.reassignmentId
                : undefined

        if (reassignmentId) {
            // Step 2: Assign to global synchronizer
            logger.info(
                `Assigning Bob's TokenAllocation to global synchronizer — reassignmentId: ${reassignmentId}`
            )

            await sdk.contracts.assignContract({
                reassignmentId,
                source: privateSynchronizerId,
                target: globalSynchronizerId,
                submitter: bob.partyId,
            })

            logger.info(
                "Bob's TokenAllocation reassigned from private → global synchronizer"
            )
        } else {
            logger.warn(
                'Could not extract reassignmentId from unassign response'
            )
        }
    } else {
        logger.warn('Bob allocation CID not found for reassignment')
    }
} else {
    logger.info(
        'Pre-settlement reassignment of TokenAllocation: SKIPPED (single synchronizer)'
    )
}

// ──────────────────────────────────────────────────────────
// 13. (4) Trading App: exercise Trade_Settle
//
//     The Trading App observes that both allocations are now
//     on the global synchronizer and settles the trade:
//       • exercise Allocation_Transfer for leg0 (Amulet: Alice→Bob)
//       • exercise Allocation_Transfer for leg1 (Token: Bob→Alice)
//
//     Result:
//       → new Amulet holding created for Bob (global sync)
//       → new Token holding created for Alice (global sync)
// ──────────────────────────────────────────────────────────

const allocationsTradingApp = await token.allocation.pending(tradingApp.partyId)

const settlementRefId = allocationRequestViewAlice.settlement.settlementRef.id
const relevantAllocations = allocationsTradingApp.filter(
    (a) =>
        a.interfaceViewValue.allocation.settlement.executor ===
            tradingApp.partyId &&
        a.interfaceViewValue.allocation.settlement.settlementRef.id ===
            settlementRefId
)

if (relevantAllocations.length === 0) {
    throw new Error('No matching allocations for this trade')
}

logger.info(
    `Relevant allocations found for settlement — count: ${relevantAllocations.length}`
)

const allocationEntries = await Promise.all(
    relevantAllocations.map(async (a) => {
        const cid = a.contractId
        const choiceContext = await token.allocation.context.execute(
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

await sdk.ledger
    .prepare({
        partyId: tradingApp.partyId,
        commands: settleCmd,
        disclosedContracts: uniqueDisclosedContracts,
    })
    .sign(tradingApp.keyPair.privateKey)
    .execute({ partyId: tradingApp.partyId })

logger.info(
    '(4) Trading App settled OTCTrade:\n' +
        '    • Allocation_Transfer exercised for Amulet leg → Amulet created for Bob (global sync)\n' +
        '    • Allocation_Transfer exercised for Token leg  → Token created for Alice (global sync)'
)

// ──────────────────────────────────────────────────────────
// 14. Post-settlement: Reassign Alice's new Token holding
//     from GLOBAL synchronizer → PRIVATE synchronizer
//
//     After settlement, Alice received a Token holding on the
//     global synchronizer (because settlement happened there).
//     The Token instrument belongs on the private sync, so
//     we reassign it back.
//
//     Flow: unassign (global) → assign (private)
//
// NOTE from presentation: "reassignment to private synchronizer
// does not yet work for external parties!"
// This step may fail at runtime until the platform supports it.
// ──────────────────────────────────────────────────────────

if (privateSynchronizerId) {
    // Read Alice's holdings after settlement to find the newly received Token
    const aliceHoldings = await token.utxos.list({ partyId: alice.partyId })

    if (aliceHoldings.length > 0) {
        // The newly received holding is the Token leg result.
        // In a real scenario we'd filter by instrumentId to find the Token.
        // STUB: When Token asset is available, filter like:
        //   const tokenHolding = aliceHoldings.find(h =>
        //       h.interfaceViewValue?.instrumentId?.id === 'Token'
        //   )
        // For now, take the last holding as the stand-in.
        const holdingToReassign = aliceHoldings[aliceHoldings.length - 1]
        const holdingContractId = holdingToReassign.contractId

        logger.info(
            `Reassigning Alice's new Token holding: global → private synchronizer` +
                ` — contractId: ${holdingContractId}, source: ${globalSynchronizerId}, target: ${privateSynchronizerId}`
        )

        try {
            // Step 1: Unassign from global synchronizer
            const unassignResult = await sdk.contracts.unassignContract({
                contractId: holdingContractId,
                source: globalSynchronizerId,
                target: privateSynchronizerId,
                submitter: alice.partyId,
            })

            const unassignEvent = unassignResult?.reassignment?.events?.[0]
            const reassignmentId =
                unassignEvent && 'JsUnassignedEvent' in unassignEvent
                    ? unassignEvent.JsUnassignedEvent.value.reassignmentId
                    : undefined

            if (reassignmentId) {
                // Step 2: Assign to private synchronizer
                logger.info(
                    `Assigning Alice's Token holding to private synchronizer — reassignmentId: ${reassignmentId}`
                )

                await sdk.contracts.assignContract({
                    reassignmentId,
                    source: globalSynchronizerId,
                    target: privateSynchronizerId,
                    submitter: alice.partyId,
                })

                logger.info(
                    "Alice's Token holding reassigned from global → private synchronizer"
                )
            } else {
                logger.warn(
                    'Could not extract reassignmentId from unassign response'
                )
            }
        } catch (err) {
            // NOTE: This may fail for external parties (see presentation note)
            logger.warn(
                { err },
                'Post-settlement reassignment failed — this is expected if ' +
                    'reassignment to private synchronizer is not yet supported for external parties'
            )
        }
    }
} else {
    logger.info(
        'Post-settlement reassignment to private synchronizer: SKIPPED (single synchronizer)'
    )
}

// ──────────────────────────────────────────────────────────
// 15. Later: exercise TransferFactory_Transfer
//     (reassignment of Token to private synchronizer)
//
// STUB: The presentation shows a later step where
// TransferFactory_Transfer is exercised to complete the
// reassignment of the Token holding to the private sync.
// This is the protocol-level completion that wraps the
// reassignment in a transfer instruction.
//
// When available:
//
//   const transferCmd = {
//       ExerciseCommand: {
//           templateId: '#token-app:TokenApp:TransferFactory',
//           contractId: transferFactoryCid,
//           choice: 'TransferFactory_Transfer',
//           choiceArgument: {
//               holdingCid: aliceTokenHoldingCid,
//               targetSynchronizer: privateSynchronizerId,
//           },
//       },
//   }
//   await sdk.ledger
//       .prepare({
//           partyId: alice.partyId,
//           commands: [transferCmd],
//           disclosedContracts: [],
//       })
//       .sign(alice.keyPair.privateKey)
//       .execute({ partyId: alice.partyId })
//
// NOTE: Presentation states "does not yet work for external parties!"
// ──────────────────────────────────────────────────────────

logger.info(
    'TransferFactory_Transfer step: STUB — not yet implemented. ' +
        'This would complete reassignment of Token to private sync.'
)

// ──────────────────────────────────────────────────────────
// 16. Verify Final Holdings
//
// Expected final state:
//   Alice: original Amulet minus 100 (global sync)
//          + 20 Token from Bob (private sync)
//   Bob:   original Token minus 20 (private sync)
//          + 100 Amulet from Alice (global sync)
// ──────────────────────────────────────────────────────────

const aliceUtxos = await token.utxos.list({ partyId: alice.partyId })
const bobUtxos = await token.utxos.list({ partyId: bob.partyId })

logger.info(`Alice final holdings (UTXOs) — count: ${aliceUtxos.length}`)
aliceUtxos.forEach((utxo, i) => {
    logger.info(`  Alice UTXO ${i} — contractId: ${utxo.contractId}`)
})

logger.info(`Bob final holdings (UTXOs) — count: ${bobUtxos.length}`)
bobUtxos.forEach((utxo, i) => {
    logger.info(`  Bob UTXO ${i} — contractId: ${utxo.contractId}`)
})

await token.holdings({ partyId: alice.partyId }).then((holdings) => {
    logger.info(`Alice holdings (full): ${JSON.stringify(holdings)}`)
})

await token.holdings({ partyId: bob.partyId }).then((holdings) => {
    logger.info(`Bob holdings (full): ${JSON.stringify(holdings)}`)
})

logger.info(
    'Multi-synchronizer DvP trade example completed successfully\n' +
        'Summary: Amulet (global sync) ↔ Token (private sync) trade with cross-sync reassignment'
)
*/
