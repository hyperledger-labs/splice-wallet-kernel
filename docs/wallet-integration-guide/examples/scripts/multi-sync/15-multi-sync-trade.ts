import pino from 'pino'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import { localNetStaticConfig, SDK } from '@canton-network/wallet-sdk'
import {
    TOKEN_NAMESPACE_CONFIG,
    TOKEN_PROVIDER_CONFIG_DEFAULT,
    logContracts,
    registerPartyOnSynchronizer,
    resolvePreferredSynchronizerId,
    vetDar,
    createScanProxyClient,
} from '../utils/index.js'
import type { PartyInfo, SynchronizerMap } from '../utils/index.js'
import type { LedgerTypes } from '@canton-network/wallet-sdk'
import {
    LOCALNET_BOB_LEDGER_URL,
    LOCALNET_TRADING_APP_LEDGER_URL,
} from './config.js'

const logger = pino({ name: 'v1-15-multi-sync-trade', level: 'info' })

// ══════════════════════════════════════════════════════════
// Multi-Synchronizer DvP Workflow
// ══════════════════════════════════════════════════════════
//
// This example implements the DvP (Delivery vs Payment) flow
// from slide 15: "Example: token using private synchronizer"
//
// Participant Nodes (localnet):
//   P1  app-user     (port 2975) — global + app-synchronizer  [hosts Alice + TradingApp]
//   P2  app-provider (port 3975) — global + app-synchronizer  [hosts Bob]
//   P3  sv           (port 4975) — global + app-synchronizer  [DAR vetting only]
//
// Parties:
//   Alice      → P1 (app-user)     — holds Amulet (global), receives Token
//   Bob        → P2 (app-provider) — holds Token (app-sync), receives Amulet
//   TradingApp → P1 (app-user)     — venue, orchestrates the OTC trade
//
// Synchronizers:
//   global          — Amulet instrument (Canton Coin / AmuletRules)
//   app-synchronizer — Token instrument (TestToken / TokenRules)
//
// Flow:
//   init:  create AmuletRules (global), create Amulet for Alice
//   init:  create TokenRules  (app-sync), create Token for Bob
//   (1)  Alice: create OTCTradeProposal (as first approver / signatory)
//   (2)  Bob: exercise OTCTradeProposal_Accept
//   (3)  Trading app: exercise OTCTradeProposal_InitiateSettlement → OTCTrade
//          (OTCTrade has all trading parties as signatories, so no extra auth needed later)
//   (4)  Alice: exercise AllocationFactory_Allocate → AmuletAllocation (global)
//   (5)  Bob:   exercise AllocationFactory_Allocate → TokenAllocation  (app-sync)
//   (5b) Bob pre-reassigns TokenAllocation app-sync → global
//          (TradingApp is not a stakeholder of Bob's allocation — no auto-reassign)
//   (6)  Trading app: OTCTrade_Settle — single-party, all contracts on global
//          → Amulet created for Bob; Token created for Alice
//   later: Alice: TransferFactory_Transfer → Token self-transferred to app-sync
//
// ══════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────
// 1. SDK Initialization
//
// Three participant nodes:
//   P1 app-user     (port 2975) — global + app-synchronizer (hosts Alice + TradingApp)
//   P2 app-provider (port 3975) — global + app-synchronizer (hosts Bob)
//   P3 sv           (port 4975) — global + app-synchronizer (DAR vetting only)
// ──────────────────────────────────────────────────────────

const [p1Sdk, p2Sdk, p3Sdk] = await Promise.all([
    SDK.create({
        auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
        token: TOKEN_NAMESPACE_CONFIG,
    }),
    SDK.create({
        auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: LOCALNET_BOB_LEDGER_URL,
        token: TOKEN_NAMESPACE_CONFIG,
    }),
    SDK.create({
        auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: LOCALNET_TRADING_APP_LEDGER_URL,
        token: TOKEN_NAMESPACE_CONFIG,
    }),
])

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p1SdkCtx = (p1Sdk.ledger as any).sdkContext
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p2SdkCtx = (p2Sdk.ledger as any).sdkContext
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p3SdkCtx = (p3Sdk.ledger as any).sdkContext

// token helpers — one per participant, used for ACS reads via each party's host
const tokenP1 = p1Sdk.token // Alice hosted on P1
const tokenP2 = p2Sdk.token // Bob hosted on P2

// ──────────────────────────────────────────────────────────
// 2. Discover Connected Synchronizers (global + app)
//
//    We query P1 to discover synchronizer IDs; they are the same
//    across participants (sequencer-assigned, not per-participant).
// ──────────────────────────────────────────────────────────

const connectedSyncResponse = await p1Sdk.ledger.state.connectedSynchronizers(
    {}
)

if (
    !connectedSyncResponse.connectedSynchronizers ||
    connectedSyncResponse.connectedSynchronizers.length < 2
) {
    throw new Error(
        'Expected at least 2 connected synchronizers (global + app), found ' +
            (connectedSyncResponse.connectedSynchronizers?.length ?? 0)
    )
}

const allSynchronizers = connectedSyncResponse.connectedSynchronizers

logger.info(
    `Connected synchronizers: ${allSynchronizers
        .map((s: LedgerTypes['ConnectedSynchronizer']) => s.synchronizerAlias)
        .join(', ')}`
)

const globalSynchronizerId = resolvePreferredSynchronizerId(allSynchronizers)

const appSynchronizer = allSynchronizers.find(
    (s: LedgerTypes['ConnectedSynchronizer']) =>
        s.synchronizerAlias === 'app-synchronizer'
)
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

const synchronizers: SynchronizerMap = {
    globalSynchronizerId,
    appSynchronizerId,
}

// ──────────────────────────────────────────────────────────
// 2b. Upload Required DARs
//
// These DARs are bundled in the same folder as this script.
//
// TODO: Once Splice is upgraded to 0.6.0 (which will include these DARs in
// the standard localnet bundle), remove the two .dar files from this folder
// and update the DAR paths below to point to .localnet/dars/ instead.
// ──────────────────────────────────────────────────────────

const here = path.dirname(fileURLToPath(import.meta.url))

const TRADING_APP_DAR = 'splice-token-test-trading-app-1.0.0.dar'
const TEST_TOKEN_V1_DAR = 'splice-test-token-v1-1.0.0.dar'

const tradingAppDarPath = path.join(here, TRADING_APP_DAR)
const testTokenV1DarPath = path.join(here, TEST_TOKEN_V1_DAR)

// Guard: verify both DARs are present before proceeding.
for (const [darPath, darName] of [
    [tradingAppDarPath, TRADING_APP_DAR],
    [testTokenV1DarPath, TEST_TOKEN_V1_DAR],
] as [string, string][]) {
    try {
        await fs.stat(darPath)
    } catch {
        throw new Error(
            `Required DAR not found: ${darPath}\n` +
                `  DAR "${darName}" is expected to be bundled in the same folder as this script.\n` +
                `  See: docs/wallet-integration-guide/examples/scripts/multi-sync/15-multi-sync-trade.md`
        )
    }
}

const [tradingAppDarBytes, testTokenV1DarBytes] = await Promise.all([
    fs.readFile(tradingAppDarPath),
    fs.readFile(testTokenV1DarPath),
])

await Promise.all([
    vetDar(p1SdkCtx.ledgerProvider, tradingAppDarBytes, globalSynchronizerId),
    vetDar(p1SdkCtx.ledgerProvider, testTokenV1DarBytes, globalSynchronizerId),
    vetDar(p2SdkCtx.ledgerProvider, tradingAppDarBytes, globalSynchronizerId),
    vetDar(p2SdkCtx.ledgerProvider, testTokenV1DarBytes, globalSynchronizerId),
    vetDar(p3SdkCtx.ledgerProvider, tradingAppDarBytes, globalSynchronizerId),
    vetDar(p3SdkCtx.ledgerProvider, testTokenV1DarBytes, globalSynchronizerId),
])
logger.info('All required DARs uploaded successfully to all 3 participants')

// ──────────────────────────────────────────────────────────
// 2c. Vet DARs on the App Synchronizer
//
//    P1 (app-user) and P2 (app-provider) host parties on app-synchronizer.
//    P3 (sv) is connected but TradingApp's choices run on global only.
// ──────────────────────────────────────────────────────────

await Promise.all([
    vetDar(p1SdkCtx.ledgerProvider, tradingAppDarBytes, appSynchronizerId),
    vetDar(p1SdkCtx.ledgerProvider, testTokenV1DarBytes, appSynchronizerId),
    vetDar(p2SdkCtx.ledgerProvider, tradingAppDarBytes, appSynchronizerId),
    vetDar(p2SdkCtx.ledgerProvider, testTokenV1DarBytes, appSynchronizerId),
])
logger.info('All DARs vetted on app-synchronizer for P1 and P2')

// ──────────────────────────────────────────────────────────
// 3. Allocate Parties (Alice, Bob, TradingApp)
//
//    Alice      → P1 (app-user)     — global + app-sync
//    Bob        → P2 (app-provider) — global + app-sync
//    TradingApp → P1 (app-user)     — co-hosted with Alice (reads proposal ACS; settles)
//
//    synchronizerId passed explicitly — SDK defaults to app-synchronizer first.
// ──────────────────────────────────────────────────────────

const PARTY_HINTS = ['v1-15-alice', 'v1-15-bob', 'v1-15-trading-app'] as const
type PartyHint = (typeof PARTY_HINTS)[number]

// Key pairs are participant-independent — generate once.
const partyKeyPairs: Record<
    PartyHint,
    ReturnType<typeof p1Sdk.keys.generate>
> = Object.fromEntries(
    PARTY_HINTS.map((hint) => [hint, p1Sdk.keys.generate()])
) as Record<PartyHint, ReturnType<typeof p1Sdk.keys.generate>>

// Allocate Alice + TradingApp on P1, Bob on P2.
const [allocatedAlice, allocatedBob, allocatedTradingApp] = await Promise.all([
    p1Sdk.party.external
        .create(partyKeyPairs['v1-15-alice'].publicKey, {
            partyHint: 'v1-15-alice',
            synchronizerId: globalSynchronizerId,
        })
        .sign(partyKeyPairs['v1-15-alice'].privateKey)
        .execute(),
    p2Sdk.party.external
        .create(partyKeyPairs['v1-15-bob'].publicKey, {
            partyHint: 'v1-15-bob',
            synchronizerId: globalSynchronizerId,
        })
        .sign(partyKeyPairs['v1-15-bob'].privateKey)
        .execute(),
    p1Sdk.party.external
        .create(partyKeyPairs['v1-15-trading-app'].publicKey, {
            partyHint: 'v1-15-trading-app',
            synchronizerId: globalSynchronizerId,
        })
        .sign(partyKeyPairs['v1-15-trading-app'].privateKey)
        .execute(),
])

const alice: PartyInfo = {
    ...allocatedAlice,
    keyPair: partyKeyPairs['v1-15-alice'],
}
const bob: PartyInfo = { ...allocatedBob, keyPair: partyKeyPairs['v1-15-bob'] }
const tradingApp: PartyInfo = {
    ...allocatedTradingApp,
    keyPair: partyKeyPairs['v1-15-trading-app'],
}

logger.info(
    `Parties allocated — alice: ${alice.partyId} (P1), bob: ${bob.partyId} (P2), tradingApp: ${tradingApp.partyId} (P1)`
)

// ──────────────────────────────────────────────────────────
// 3b. Register parties on the app-synchronizer
//
//     Register Alice, Bob, and TradingApp on app-synchronizer.
//     All three are informees of app-sync transactions (Token, TokenRules, Allocation).
//     No global re-registration needed — parties were created there already.
// ──────────────────────────────────────────────────────────

await Promise.all([
    registerPartyOnSynchronizer(
        p1SdkCtx.ledgerProvider,
        alice,
        appSynchronizerId
    ),
    registerPartyOnSynchronizer(
        p2SdkCtx.ledgerProvider,
        bob,
        appSynchronizerId
    ),
    registerPartyOnSynchronizer(
        p1SdkCtx.ledgerProvider,
        tradingApp,
        appSynchronizerId
    ),
])
logger.info('Alice, Bob, and TradingApp registered on app-synchronizer')

// ──────────────────────────────────────────────────────────
// 4. Discover Amulet Asset via Scan Proxy
//
//    Fetch AmuletRules + active OpenMiningRound from the validator's
//    scan proxy endpoints. Token contracts are discovered similarly.
// ──────────────────────────────────────────────────────────

const scanProxyClient = await createScanProxyClient(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
    TOKEN_PROVIDER_CONFIG_DEFAULT,
    logger
)

const {
    amuletRulesContract,
    amuletRulesCid,
    amuletAdmin,
    activeRoundContract,
    openMiningRoundCid,
} = await scanProxyClient.fetchAmuletInfo()

logger.info(`Amulet asset discovered — admin: ${amuletAdmin}`)

// ──────────────────────────────────────────────────────────
// 5 + 6a + 6b (parallel)
//
//   Step 5:  Mint Amulets for Alice (global synchronizer)
//   Step 6a: Create TokenRules for Bob (app-synchronizer)
//   Step 6b: Mint Token holding for Bob (app-synchronizer)
//
//   These steps are independent and can run concurrently.
// ──────────────────────────────────────────────────────────

const TEST_TOKEN_TEMPLATE_PREFIX =
    '#splice-test-token-v1:Splice.Testing.Tokens.TestTokenV1'

await Promise.all([
    // Step 5: Mint Amulets for Alice via AmuletRules_DevNet_Tap.
    //    AmuletRules + OpenMiningRound must be disclosed for the choice.
    (async () => {
        const amuletDisclosed = [
            {
                templateId: amuletRulesContract.template_id,
                contractId: amuletRulesCid,
                createdEventBlob: amuletRulesContract.created_event_blob,
                synchronizerId: globalSynchronizerId,
            },
            {
                templateId: activeRoundContract.template_id,
                contractId: openMiningRoundCid,
                createdEventBlob: activeRoundContract.created_event_blob,
                synchronizerId: globalSynchronizerId,
            },
        ]

        const amuletTapCmd = [
            {
                ExerciseCommand: {
                    templateId: '#splice-amulet:Splice.AmuletRules:AmuletRules',
                    contractId: amuletRulesCid,
                    choice: 'AmuletRules_DevNet_Tap',
                    choiceArgument: {
                        receiver: alice.partyId,
                        amount: '2000000',
                        openRound: openMiningRoundCid,
                    },
                },
            },
        ]

        await p1Sdk.ledger
            .prepare({
                partyId: alice.partyId,
                commands: amuletTapCmd,
                disclosedContracts: amuletDisclosed,
                synchronizerId: globalSynchronizerId,
            })
            .sign(alice.keyPair.privateKey)
            .execute({ partyId: alice.partyId })

        logger.info('Alice: Amulet holding minted (2,000,000)')
    })(),

    // Step 6a: Create TokenRules for Bob on app-synchronizer (implements
    //    AllocationFactory + TransferFactory). Bob is admin; P2 (app-provider) submits.
    (async () => {
        const createTokenRulesCmd = {
            CreateCommand: {
                templateId: `${TEST_TOKEN_TEMPLATE_PREFIX}:TokenRules`,
                createArguments: {
                    admin: bob.partyId,
                },
            },
        }

        await p2Sdk.ledger
            .prepare({
                partyId: bob.partyId,
                commands: createTokenRulesCmd,
                disclosedContracts: [],
                synchronizerId: appSynchronizerId,
            })
            .sign(bob.keyPair.privateKey)
            .execute({ partyId: bob.partyId })

        logger.info(
            'TokenRules created by Bob via P2 (app-provider, on app-synchronizer)'
        )
    })(),

    // Step 6b: Mint Token holding for Bob on app-synchronizer.
    //    Bob is owner + instrumentId.admin — sole signatory; P2 (app-provider) submits.
    (async () => {
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

        await p2Sdk.ledger
            .prepare({
                partyId: bob.partyId,
                commands: createTokenCmd,
                disclosedContracts: [],
                synchronizerId: appSynchronizerId,
            })
            .sign(bob.keyPair.privateKey)
            .execute({ partyId: bob.partyId })

        logger.info(
            'Bob: Token holding minted via P2 (app-provider, 500 TestToken, on app-synchronizer)'
        )
    })(),
])

const AMULET_TEMPLATE_ID = '#splice-amulet:Splice.Amulet:Amulet'

logger.info('Contracts after steps 5 + 6a + 6b:')
await logContracts(
    p1Sdk,
    logger,
    synchronizers,
    'Alice Amulet',
    [AMULET_TEMPLATE_ID],
    [alice.partyId]
)
await logContracts(
    p2Sdk,
    logger,
    synchronizers,
    'TokenRules',
    [`${TEST_TOKEN_TEMPLATE_PREFIX}:TokenRules`],
    [bob.partyId]
)
await logContracts(
    p2Sdk,
    logger,
    synchronizers,
    'Bob Token',
    [`${TEST_TOKEN_TEMPLATE_PREFIX}:Token`],
    [bob.partyId]
)

// ──────────────────────────────────────────────────────────
// 7. Create Trade Proposal + Approve + Initiate Settlement
//
//    (a) Alice creates OTCTradeProposal (signatory approvers — must have one signatory)
//    (b) Bob exercises OTCTradeProposal_Accept
//    (c) TradingApp exercises OTCTradeProposal_InitiateSettlement → OTCTrade
//          (signatory: venue + all trading parties → venue settles alone)
//
//    Leg 0: Alice → Bob (100 Amulet);  Leg 1: Bob → Alice (20 Token)
//    V1 transferLegs is a TextMap (object keyed by legId).
// ──────────────────────────────────────────────────────────

const TRADING_APP_TEMPLATE_PREFIX =
    '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp'

// V1 transferLegs: TextMap keyed by legId (not an array)
const transferLegs = {
    'leg-0': {
        sender: alice.partyId,
        receiver: bob.partyId,
        amount: '100',
        instrumentId: { admin: amuletAdmin, id: 'Amulet' },
        meta: { values: {} },
    },
    'leg-1': {
        sender: bob.partyId,
        receiver: alice.partyId,
        amount: '20',
        instrumentId: { admin: bob.partyId, id: 'TestToken' },
        meta: { values: {} },
    },
}

// Step 7a: Alice creates OTCTradeProposal as the first approver.
// OTCTradeProposal has `signatory approvers` — Alice is the first signatory;
// TradingApp is an observer who will later exercise InitiateSettlement.
const createProposal = {
    CreateCommand: {
        templateId: `${TRADING_APP_TEMPLATE_PREFIX}:OTCTradeProposal`,
        createArguments: {
            venue: tradingApp.partyId,
            tradeCid: null,
            transferLegs,
            approvers: [alice.partyId],
        },
    },
}

await p1Sdk.ledger
    .prepare({
        partyId: alice.partyId,
        commands: createProposal,
        disclosedContracts: [],
        synchronizerId: globalSynchronizerId,
    })
    .sign(alice.keyPair.privateKey)
    .execute({ partyId: alice.partyId })

logger.info(
    'OTCTradeProposal created by Alice via P1 (first approver):\n' +
        '    Leg 0: Alice -> Bob (100 Amulet)\n' +
        '    Leg 1: Bob -> Alice (20 TestToken)'
)

// Step 7b: Bob accepts the proposal (adds him to approvers; P2 reads and submits).

const readProposal = async (sdk: typeof p1Sdk, party: string) => {
    const proposals = await sdk.ledger.acs.read({
        templateIds: [`${TRADING_APP_TEMPLATE_PREFIX}:OTCTradeProposal`],
        parties: [party],
        filterByParty: true,
    })
    if (!proposals.length) throw new Error('OTCTradeProposal not found')
    return proposals[0].contractId
}

// Bob accepts via P2
const proposalCid2 = await readProposal(p2Sdk, bob.partyId)
await p2Sdk.ledger
    .prepare({
        partyId: bob.partyId,
        commands: [
            {
                ExerciseCommand: {
                    templateId: `${TRADING_APP_TEMPLATE_PREFIX}:OTCTradeProposal`,
                    contractId: proposalCid2,
                    choice: 'OTCTradeProposal_Accept',
                    choiceArgument: { approver: bob.partyId },
                },
            },
        ],
        disclosedContracts: [],
        synchronizerId: globalSynchronizerId,
    })
    .sign(bob.keyPair.privateKey)
    .execute({ partyId: bob.partyId })
logger.info('Bob accepted OTCTradeProposal via P2 (app-provider)')

// Step 7c: TradingApp initiates settlement → OTCTrade (signatory: venue + Alice + Bob).
const proposalCid3 = await readProposal(p1Sdk, tradingApp.partyId)
const prepareUntil = new Date(Date.now() + 1800 * 1000).toISOString()
const settleBefore = new Date(Date.now() + 3600 * 1000).toISOString()

await p1Sdk.ledger
    .prepare({
        partyId: tradingApp.partyId,
        commands: [
            {
                ExerciseCommand: {
                    templateId: `${TRADING_APP_TEMPLATE_PREFIX}:OTCTradeProposal`,
                    contractId: proposalCid3,
                    choice: 'OTCTradeProposal_InitiateSettlement',
                    choiceArgument: { prepareUntil, settleBefore },
                },
            },
        ],
        disclosedContracts: [],
        synchronizerId: globalSynchronizerId,
    })
    .sign(tradingApp.keyPair.privateKey)
    .execute({ partyId: tradingApp.partyId })

logger.info(
    'TradingApp initiated settlement → OTCTrade created via P1 (app-user)'
)
logger.info('Contracts after step 7 (Proposal → Accept → InitiateSettlement):')
await logContracts(
    p1Sdk,
    logger,
    synchronizers,
    'OTCTrade',
    [`${TRADING_APP_TEMPLATE_PREFIX}:OTCTrade`],
    [tradingApp.partyId]
)

// ──────────────────────────────────────────────────────────
// 8. No separate "Request Allocations" step needed
//
//    OTCTrade itself implements AllocationRequest. Trading parties
//    read it directly to create allocations — no extra request contracts.
// ──────────────────────────────────────────────────────────

// Read the OTCTrade contract ID (TradingApp is stakeholder, hosted on P1).
const otcTradeContracts = await p1Sdk.ledger.acs.read({
    templateIds: [`${TRADING_APP_TEMPLATE_PREFIX}:OTCTrade`],
    parties: [tradingApp.partyId],
    filterByParty: true,
})
const otcTradeCid = otcTradeContracts[0]?.contractId
if (!otcTradeCid) throw new Error('OTCTrade contract not found')

// ──────────────────────────────────────────────────────────
// 9 + 10 (parallel)
//
//   Step 9:  Alice allocates Amulet for leg-0 (global sync)
//   Step 10: Bob allocates TestToken for leg-1 (app-sync)
//
//   These allocations are independent and can run concurrently.
// ──────────────────────────────────────────────────────────

const ALLOCATION_FACTORY_INTERFACE_ID =
    '#splice-api-token-allocation-instruction-v1:Splice.Api.Token.AllocationInstructionV1:AllocationFactory'

const [legIdAlice, { legId: legIdBob, tokenRulesCid, tokenRulesContract }] =
    await Promise.all([
        // Step 9: Alice allocates Amulet for leg-0.
        //    Amulet's AllocationFactory is discovered via the scan proxy registry
        //    (not directly in ACS like TokenRules). P1 (app-user) queries and submits.
        (async () => {
            const pendingRequestsAlice =
                await tokenP1.allocation.request.pending(alice.partyId)
            const requestViewAlice = pendingRequestsAlice[0].interfaceViewValue!

            const legId = Object.keys(requestViewAlice.transferLegs).find(
                (key) =>
                    requestViewAlice.transferLegs[key].sender === alice.partyId
            )!
            if (!legId) throw new Error('No transfer leg found for Alice')

            const amuletHoldings = await logContracts(
                p1Sdk,
                logger,
                synchronizers,
                'Alice Amulet (for allocation)',
                [AMULET_TEMPLATE_ID],
                [alice.partyId]
            )
            const amuletHoldingCid = amuletHoldings[0]?.contractId
            if (!amuletHoldingCid)
                throw new Error('Amulet holding not found for Alice')

            const allocationChoiceArgs = {
                expectedAdmin: amuletAdmin,
                allocation: {
                    settlement: requestViewAlice.settlement,
                    transferLegId: legId,
                    transferLeg: requestViewAlice.transferLegs[legId],
                },
                requestedAt: new Date().toISOString(),
                inputHoldingCids: [amuletHoldingCid],
                extraArgs: {
                    context: { values: {} as Record<string, unknown> },
                    meta: { values: {} },
                },
            }

            const { factoryId, choiceContext } =
                await scanProxyClient.fetchAllocationFactory(
                    allocationChoiceArgs
                )

            allocationChoiceArgs.extraArgs.context = {
                ...(choiceContext.choiceContextData ?? {}),
                values:
                    (choiceContext.choiceContextData?.values as Record<
                        string,
                        unknown
                    >) ?? {},
            }

            const allocateAliceCmd = [
                {
                    ExerciseCommand: {
                        templateId: ALLOCATION_FACTORY_INTERFACE_ID,
                        contractId: factoryId,
                        choice: 'AllocationFactory_Allocate',
                        choiceArgument: allocationChoiceArgs,
                    },
                },
            ]

            await p1Sdk.ledger
                .prepare({
                    partyId: alice.partyId,
                    commands: allocateAliceCmd,
                    disclosedContracts: choiceContext.disclosedContracts ?? [],
                    synchronizerId: globalSynchronizerId,
                })
                .sign(alice.keyPair.privateKey)
                .execute({ partyId: alice.partyId })

            logger.info('Alice: Amulet allocation created for leg-0')
            return legId
        })(),

        // Step 10: Bob allocates TestToken for leg-1.
        //    TokenRules directly implements AllocationFactory — no registry needed.
        //    Bob is on P2 (app-provider); P2 queries and submits.
        (async () => {
            const pendingRequestsBob = await tokenP2.allocation.request.pending(
                bob.partyId
            )
            const requestViewBob = pendingRequestsBob[0].interfaceViewValue!

            const legId = Object.keys(requestViewBob.transferLegs).find(
                (key) => requestViewBob.transferLegs[key].sender === bob.partyId
            )!
            if (!legId) throw new Error('No transfer leg found for Bob')

            const tokenHoldings = await p2Sdk.ledger.acs.read({
                templateIds: [`${TEST_TOKEN_TEMPLATE_PREFIX}:Token`],
                parties: [bob.partyId],
                filterByParty: true,
            })
            const tokenHoldingCid = tokenHoldings[0]?.contractId
            if (!tokenHoldingCid)
                throw new Error('Token holding not found for Bob')

            const tokenRulesContracts = await p2Sdk.ledger.acs.read({
                templateIds: [`${TEST_TOKEN_TEMPLATE_PREFIX}:TokenRules`],
                parties: [bob.partyId],
                filterByParty: true,
            })
            const tokenRulesCid = tokenRulesContracts[0]?.contractId
            if (!tokenRulesCid) throw new Error('TokenRules contract not found')
            const tokenRulesContract = tokenRulesContracts[0]

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
                                transferLegId: legId,
                                transferLeg: requestViewBob.transferLegs[legId],
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

            await p2Sdk.ledger
                .prepare({
                    partyId: bob.partyId,
                    commands: allocateBobCmd,
                    disclosedContracts: [],
                    synchronizerId: appSynchronizerId,
                })
                .sign(bob.keyPair.privateKey)
                .execute({ partyId: bob.partyId })

            logger.info(
                'Bob: TestToken allocation created via P2 (app-provider, leg-1, on app-synchronizer)'
            )
            return { legId, tokenRulesCid, tokenRulesContract }
        })(),
    ])

logger.info('Contracts after steps 9 + 10 (allocations):')
await logContracts(
    p1Sdk,
    logger,
    synchronizers,
    'Alice Amulet',
    [AMULET_TEMPLATE_ID],
    [alice.partyId]
)
await logContracts(
    p1Sdk,
    logger,
    synchronizers,
    'Alice Token',
    [`${TEST_TOKEN_TEMPLATE_PREFIX}:Token`],
    [alice.partyId]
)
await logContracts(
    p2Sdk,
    logger,
    synchronizers,
    'Bob Token',
    [`${TEST_TOKEN_TEMPLATE_PREFIX}:Token`],
    [bob.partyId]
)

// ──────────────────────────────────────────────────────────
// 10b. Pre-reassign Bob's TestToken allocation to global sync
//
//      Bob's allocation is on app-synchronizer; OTCTrade is on global.
//      TradingApp is not a stakeholder of Bob's allocation, so Canton
//      cannot auto-reassign it. Bob pre-reassigns manually:
//        (1) Unassign from app-synchronizer → (2) Assign to global.
// ──────────────────────────────────────────────────────────

// Read Bob's allocation via P2 (his hosting participant).
const allocationsBob = await tokenP2.allocation.pending(bob.partyId)
const testTokenAllocation = allocationsBob.find(
    (a) => a.interfaceViewValue.allocation.transferLegId === legIdBob
)
if (!testTokenAllocation) throw new Error('TestToken allocation not found')
const testTokenAllocationCid = testTokenAllocation.contractId

// Step 1: Unassign from app-synchronizer
const unassignResp = await p2SdkCtx.ledgerProvider.request({
    method: 'ledgerApi',
    params: {
        resource: '/v2/commands/submit-and-wait-for-reassignment',
        requestMethod: 'post',
        body: {
            reassignmentCommands: {
                userId: p2SdkCtx.userId,
                commandId: crypto.randomUUID(),
                submitter: bob.partyId,
                commands: [
                    {
                        command: {
                            UnassignCommand: {
                                value: {
                                    contractId: testTokenAllocationCid,
                                    source: appSynchronizerId,
                                    target: globalSynchronizerId,
                                },
                            },
                        },
                    },
                ],
            },
            eventFormat: {
                filtersByParty: {
                    [bob.partyId]: {
                        cumulative: [{ wildcardFilter: {} }],
                    },
                },
                verbose: true,
            },
        },
    },
})

// Extract reassignmentId from the unassigned event
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unassignedEvent = (unassignResp as any)?.reassignment?.events?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => e.JsUnassignedEvent
)
const reassignmentId = unassignedEvent?.JsUnassignedEvent?.value?.reassignmentId
if (!reassignmentId)
    throw new Error('Failed to get reassignmentId from unassign response')

// Step 2: Assign to global synchronizer
await p2SdkCtx.ledgerProvider.request({
    method: 'ledgerApi',
    params: {
        resource: '/v2/commands/submit-and-wait-for-reassignment',
        requestMethod: 'post',
        body: {
            reassignmentCommands: {
                userId: p2SdkCtx.userId,
                commandId: crypto.randomUUID(),
                submitter: bob.partyId,
                commands: [
                    {
                        command: {
                            AssignCommand: {
                                value: {
                                    reassignmentId,
                                    source: appSynchronizerId,
                                    target: globalSynchronizerId,
                                },
                            },
                        },
                    },
                ],
            },
        },
    },
})

logger.info(
    `Bob: TestToken allocation reassigned from app-sync to global (cid=${testTokenAllocationCid.slice(0, 16)}...)`
)

// ──────────────────────────────────────────────────────────
// 11. TradingApp: Settle the OTCTrade (single-party submit)
//
//     OTCTrade signatories include venue + Alice + Bob, so TradingApp
//     alone provides full authority for Allocation_ExecuteTransfer.
//     All contracts are on global after step 10b. Bob's allocation
//     is disclosed from P2 (app-provider).
// ──────────────────────────────────────────────────────────

// Read Alice's allocation via P1 (her hosting participant).
const allocationsAlice = await tokenP1.allocation.pending(alice.partyId)
const amuletAllocation = allocationsAlice.find(
    (a) => a.interfaceViewValue.allocation.transferLegId === legIdAlice
)
if (!amuletAllocation) throw new Error('Amulet allocation not found')

// Fetch execute-transfer context from the scan proxy registry (required for Amulet).
const amuletExecContext = await scanProxyClient.fetchExecuteTransferContext(
    amuletAllocation.contractId
)

// OTCTrade_Settle takes a TextMap keyed by legId; Daml tuples encode as { _1, _2 }.
const allocationsWithContext = {
    [legIdAlice]: {
        _1: amuletAllocation.contractId,
        _2: {
            context: {
                ...(amuletExecContext.choiceContextData ?? {}),
                values:
                    (amuletExecContext.choiceContextData?.values as Record<
                        string,
                        unknown
                    >) ?? {},
            },
            meta: { values: {} },
        },
    },
    [legIdBob]: {
        _1: testTokenAllocationCid,
        _2: {
            context: { values: {} },
            meta: { values: {} },
        },
    },
}

const settleCmd = [
    {
        ExerciseCommand: {
            templateId: `${TRADING_APP_TEMPLATE_PREFIX}:OTCTrade`,
            contractId: otcTradeCid,
            choice: 'OTCTrade_Settle',
            choiceArgument: {
                allocationsWithContext,
            },
        },
    },
]

// Disclosed: Amulet system contracts from scan proxy (synchronizerId='' inferred from blob)
// and Bob's TestToken allocation from P2 (P1 doesn't host Bob).
// Helper to convert an ACS contract to a disclosed-contract entry.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDisclosed = (c: any) => ({
    templateId: c.templateId as string,
    contractId: c.contractId as string,
    createdEventBlob: c.createdEventBlob as string,
    synchronizerId: c.synchronizerId as string,
})

// Read Bob's TestToken allocation for disclosure (now on global after step 10b).
const bobAllocContracts = await p2Sdk.ledger.acs.read({
    interfaceIds: [
        '#splice-api-token-allocation-v1:Splice.Api.Token.AllocationV1:Allocation',
    ],
    parties: [bob.partyId],
    filterByParty: true,
})
const bobAllocForDisclosure = bobAllocContracts.find(
    (c) => c.contractId === testTokenAllocationCid
)
if (!bobAllocForDisclosure)
    throw new Error('TestToken allocation not found for disclosure')

const scanProxyDisclosed = (amuletExecContext.disclosedContracts ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c: any) => ({
        ...c,
        synchronizerId: '', // let Canton infer from the blob
    })
)

const settlementDisclosedContracts = [
    ...scanProxyDisclosed,
    toDisclosed(bobAllocForDisclosure),
]

await p1Sdk.ledger
    .prepare({
        partyId: tradingApp.partyId,
        commands: settleCmd,
        disclosedContracts: settlementDisclosedContracts,
        synchronizerId: globalSynchronizerId,
    })
    .sign(tradingApp.keyPair.privateKey)
    .execute({ partyId: tradingApp.partyId })

logger.info(
    'Trading App: OTCTrade settled via Allocation_ExecuteTransfer:\n' +
        '    Allocation_ExecuteTransfer (leg-0): 100 Amulet transferred Alice -> Bob (new Amulet contract)\n' +
        '    Allocation_ExecuteTransfer (leg-1): 20 TestToken transferred Bob -> Alice (new Token contract)'
)
logger.info('Contracts after step 11 (Settle):')
await logContracts(
    p1Sdk,
    logger,
    synchronizers,
    'Alice Amulet',
    [AMULET_TEMPLATE_ID],
    [alice.partyId]
)
await logContracts(
    p2Sdk,
    logger,
    synchronizers,
    'Bob Amulet',
    [AMULET_TEMPLATE_ID],
    [bob.partyId]
)
await logContracts(
    p1Sdk,
    logger,
    synchronizers,
    'Alice Token',
    [`${TEST_TOKEN_TEMPLATE_PREFIX}:Token`],
    [alice.partyId]
)
await logContracts(
    p2Sdk,
    logger,
    synchronizers,
    'Bob Token',
    [`${TEST_TOKEN_TEMPLATE_PREFIX}:Token`],
    [bob.partyId]
)
await logContracts(
    p2Sdk,
    logger,
    synchronizers,
    'TokenRules',
    [`${TEST_TOKEN_TEMPLATE_PREFIX}:TokenRules`],
    [bob.partyId]
)

// ──────────────────────────────────────────────────────────
// 12. Alice: Transfer Token to app-synchronizer
//
//     Self-transfer (Alice → Alice) targeting app-synchronizer.
//     Canton's router auto-reassigns Alice's Token to where TokenRules lives.
//     Alice controls the transfer; TokenRules (admin = Bob) provides Bob's
//     authority inside the choice. Single-party submit via P1.
//     TokenRules is disclosed from P2 (app-provider).
// ──────────────────────────────────────────────────────────

// Find Alice's Token holding (received from settlement) via P1.
const aliceTokenHoldings = await logContracts(
    p1Sdk,
    logger,
    synchronizers,
    'Alice Token (pre-transfer)',
    [`${TEST_TOKEN_TEMPLATE_PREFIX}:Token`],
    [alice.partyId]
)
const aliceTokenHoldingCid = aliceTokenHoldings[0]?.contractId
if (!aliceTokenHoldingCid)
    throw new Error('Token holding not found for Alice after settlement')

const TRANSFER_FACTORY_INTERFACE_ID =
    '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferFactory'

const transferCmd = [
    {
        ExerciseCommand: {
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
        },
    },
]

await p1Sdk.ledger
    .prepare({
        partyId: alice.partyId,
        commands: transferCmd,
        disclosedContracts: [
            {
                templateId: tokenRulesContract!.templateId!,
                contractId: tokenRulesCid,
                createdEventBlob: tokenRulesContract!.createdEventBlob!,
                synchronizerId: tokenRulesContract!.synchronizerId,
            },
        ],
        synchronizerId: appSynchronizerId,
    })
    .sign(alice.keyPair.privateKey)
    .execute({ partyId: alice.partyId })

logger.info(
    'Alice: TestToken self-transferred on app-synchronizer via TransferFactory_Transfer'
)
logger.info('Final contract state after step 12 (Transfer):')
await logContracts(
    p1Sdk,
    logger,
    synchronizers,
    'Alice Amulet',
    [AMULET_TEMPLATE_ID],
    [alice.partyId]
)
await logContracts(
    p2Sdk,
    logger,
    synchronizers,
    'Bob Amulet',
    [AMULET_TEMPLATE_ID],
    [bob.partyId]
)
await logContracts(
    p1Sdk,
    logger,
    synchronizers,
    'Alice Token',
    [`${TEST_TOKEN_TEMPLATE_PREFIX}:Token`],
    [alice.partyId]
)
await logContracts(
    p2Sdk,
    logger,
    synchronizers,
    'Bob Token',
    [`${TEST_TOKEN_TEMPLATE_PREFIX}:Token`],
    [bob.partyId]
)
await logContracts(
    p2Sdk,
    logger,
    synchronizers,
    'TokenRules',
    [`${TEST_TOKEN_TEMPLATE_PREFIX}:TokenRules`],
    [bob.partyId]
)
