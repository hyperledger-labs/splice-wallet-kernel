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
//   P1  app-user     (port 2975) — global + app-synchronizer
//   P2  app-provider (port 3975) — global + app-synchronizer
//   P3  sv           (port 4975) — global only
//
// Parties:
//   Alice      — holds Amulet (global sync), receives Token
//   Bob        — holds Token  (app-sync),    receives Amulet
//   TradingApp — orchestrates the OTC trade (global only)
//
//   Each party is hosted on its natural participant:
//     Alice      → P1 (app-user)     — needs both synchronizers
//     Bob        → P2 (app-provider) — needs both synchronizers
//     TradingApp → P3 (sv)           — only needs global sync
//
//   Canton's ACS query API and interactive-submission prepare API
//   both require the calling participant to host the party, so each
//   single-party step uses the party's dedicated participant.
//
//   Settlement (step 11) is submitted by TradingApp (venue) alone.
//   The V1 trading app's OTCTrade has all trading parties as
//   signatories, so Allocation_ExecuteTransfer gets full authority
//   from the contract's signatories — no multi-party signing needed.
//   TradingApp is cross-registered on P1 for settlement because P1
//   connects to both synchronizers (required for cross-sync routing).
//
// Synchronizers:
//   global          — Amulet instrument (Canton Coin / AmuletRules)
//   app-synchronizer — Token instrument (TestToken / TokenRules)
//
// Flow:
//   init:  create AmuletRules (global), create Amulet for Alice
//   init:  create TokenRules  (app-sync), create Token for Bob
//   (1)  Trading app: create OTCTradeProposal
//   (2)  Alice + Bob: each exercises OTCTradeProposal_Accept
//   (3)  Trading app: exercise OTCTradeProposal_InitiateSettlement → OTCTrade
//          (OTCTrade has all trading parties as signatories, so no extra auth needed later)
//   (4)  Alice: exercise AllocationFactory_Allocate → AmuletAllocation (global)
//   (5)  Bob:   exercise AllocationFactory_Allocate → TokenAllocation  (app-sync)
//   (6)  Trading app: exercise OTCTrade_Settle (venue-only, single-party submit!)
//          • Canton auto-reassigns TokenAllocation (app-sync → global)
//          • exercise Allocation_ExecuteTransfer for both legs
//          → Amulet created for Bob (global)
//          → Token created for Alice (global)
//   later: Alice exercises TransferFactory_Transfer → Token reassigned to app-sync
//
// ══════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────
// 1. SDK Initialization
//
// Three participant nodes, each dedicated to one party:
//   P1 app-user     (port 2975) — global + app-synchronizer
//   P2 app-provider (port 3975) — global + app-synchronizer
//   P3 sv           (port 4975) — global only
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
//    All three participants are connected to both synchronizers.
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
//    P1 and P2 are connected to app-synchronizer; P3 (sv) is
//    connected to global only. Token/TokenRules DARs must be
//    vetted on app-synchronizer for every participant that will
//    process transactions on that synchronizer.
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
//    Each party is created on its natural participant:
//      Alice      → P1 (app-user)     — needs global + app-sync
//      Bob        → P2 (app-provider) — needs global + app-sync
//      TradingApp → P3 (sv)           — only needs global
//
//    Canton's external-party API does not support adding a second
//    host to an already-existing party via party.external.create —
//    the call returns "Party already created". The hosting
//    participant must be chosen at creation time. Additional
//    co-hosting is achieved via registerPartyOnSynchronizer later.
//
//    P1 (alice's participant) also hosts TradingApp for settlement
//    (step 11) because P1 connects to both synchronizers, which is
//    required for Canton's cross-sync transaction routing.
//
//    The synchronizerId is passed explicitly: when a participant is
//    connected to multiple synchronizers the SDK defaults to the first
//    one returned by the API (app-synchronizer), so we must be explicit.
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

// Allocate Alice on P1, Bob on P2, TradingApp on P3.
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
    p3Sdk.party.external
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
    `Parties allocated — alice: ${alice.partyId} (P1), bob: ${bob.partyId} (P2), tradingApp: ${tradingApp.partyId} (P3)`
)

// ──────────────────────────────────────────────────────────
// 3b. Cross-register parties for multi-participant visibility
//
//     Phase 1 — App-synchronizer registrations:
//       Alice on P1 (app-sync) — receives Token after settlement
//       Bob   on P2 (app-sync) — Token/TokenRules operations
//
//     Phase 2 — Cross-register TradingApp on P1 for settlement:
//       TradingApp on P1 (global) — so P1 can submit settlement
//         as TradingApp. P1 is connected to both synchronizers,
//         which is required for Canton's transaction router to
//         reassign Bob's app-sync allocation to global during settle.
//
//     Phase 3 — Cross-register for proposal visibility:
//       Alice      on P3 (global) — P3 sees Alice as trade party
//       Bob        on P3 (global) — P3 sees Bob as trade party
//       TradingApp on P2 (global) — P2 sees proposal (venue observer)
//       TradingApp on P1 (global) — covered by Phase 2
// ──────────────────────────────────────────────────────────

// Phase 1: App-sync registrations via each party's home participant.
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
])
logger.info('Alice (P1) and Bob (P2) registered on app-synchronizer')

// Phase 2: Cross-register TradingApp on P1 so P1 can submit
// settlement as venue. P1 connects to both syncs (required for
// Canton's transaction router to reassign app-sync allocations).
await registerPartyOnSynchronizer(
    p1SdkCtx.ledgerProvider,
    tradingApp,
    globalSynchronizerId
)
logger.info('TradingApp cross-registered on P1 (for settlement)')

// Phase 3: Cross-register for proposal and contract visibility.
await Promise.all([
    registerPartyOnSynchronizer(
        p3SdkCtx.ledgerProvider,
        alice,
        globalSynchronizerId
    ),
    registerPartyOnSynchronizer(
        p3SdkCtx.ledgerProvider,
        bob,
        globalSynchronizerId
    ),
    registerPartyOnSynchronizer(
        p2SdkCtx.ledgerProvider,
        tradingApp,
        globalSynchronizerId
    ),
])
logger.info('Cross-registrations complete for contract visibility')

// Grant TradingApp actAs rights on P1 so P1 can submit settlement.
await p1Sdk.user.rights.grant({
    userRights: { actAs: [tradingApp.partyId] },
})
logger.info('P1 (app-user) can now actAs TradingApp (for settlement)')

// ──────────────────────────────────────────────────────────
// 4. Discover Amulet Asset via Scan Proxy
//
//    Fetch AmuletRules and the active OpenMiningRound directly
//    from the scan proxy (validator's /v0/scan-proxy endpoints).
//    This avoids the App Registry and mirrors the explicit
//    approach used for Token contracts.
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
    // Step 5: Mint Amulets for Alice
    //
    //     AmuletRules_DevNet_Tap creates a new Amulet holding for the
    //     receiver. AmuletRules and the active OpenMiningRound must be
    //     disclosed so the ledger can process the choice.
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

    // Step 6a: Create TokenRules on the App (private) Synchronizer
    //
    //     The TokenRules contract implements TransferFactory and
    //     AllocationFactory interfaces from the token standard.
    //     It is needed for allocation during trade settlement.
    //     Token and TokenRules live on the private/app synchronizer.
    //     Bob is the admin and is hosted on P2, so P2 (app-provider) submits.
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

    // Step 6b: Mint Token holding for Bob on the App (private) Synchronizer
    //
    //     Bob is both the owner and the instrumentId.admin of
    //     the Token, so he is the sole signatory and a simple
    //     single-party prepare/sign/execute is sufficient.
    //     The Token holding lives on the app-synchronizer.
    //     Bob is hosted on P2, so P2 (app-provider) submits.
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
//    V1 trading app workflow:
//      (a) TradingApp creates OTCTradeProposal
//      (b) Alice and Bob each exercise OTCTradeProposal_Accept
//      (c) TradingApp exercises OTCTradeProposal_InitiateSettlement
//          → creates OTCTrade (signatory: venue + all trading parties)
//
//    Because all parties become signatories of OTCTrade, the
//    venue alone can later settle (controller venue) with full
//    authority — no multiPartySubmit needed.
//
//    Leg 0 (Amulet leg): Alice sends 100 Amulet to Bob
//    Leg 1 (Token leg):  Bob sends 20 Token to Alice
//
//    Uses the splice-token-test-trading-app DAR (v1).
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

// Step 7a: TradingApp creates OTCTradeProposal on P3 (sv).
const createProposal = {
    CreateCommand: {
        templateId: `${TRADING_APP_TEMPLATE_PREFIX}:OTCTradeProposal`,
        createArguments: {
            venue: tradingApp.partyId,
            tradeCid: null,
            transferLegs,
            approvers: [],
        },
    },
}

await p3Sdk.ledger
    .prepare({
        partyId: tradingApp.partyId,
        commands: createProposal,
        disclosedContracts: [],
        synchronizerId: globalSynchronizerId,
    })
    .sign(tradingApp.keyPair.privateKey)
    .execute({ partyId: tradingApp.partyId })

logger.info(
    'OTCTradeProposal created by TradingApp via P3 (sv):\n' +
        '    Leg 0: Alice -> Bob (100 Amulet)\n' +
        '    Leg 1: Bob -> Alice (20 TestToken)'
)

// Step 7b: Alice and Bob each accept the proposal.
// The proposal is visible to trading parties (observer), so P1 and P2 can read it.
// Each accept creates a new proposal with the approver added.
// Alice accepts first (via P1), then Bob accepts the updated proposal (via P2).

const readProposal = async (sdk: typeof p1Sdk, party: string) => {
    const proposals = await sdk.ledger.acs.read({
        templateIds: [`${TRADING_APP_TEMPLATE_PREFIX}:OTCTradeProposal`],
        parties: [party],
        filterByParty: true,
    })
    if (!proposals.length) throw new Error('OTCTradeProposal not found')
    return proposals[0].contractId
}

// Alice accepts via P1
const proposalCid1 = await readProposal(p1Sdk, alice.partyId)
await p1Sdk.ledger
    .prepare({
        partyId: alice.partyId,
        commands: [
            {
                ExerciseCommand: {
                    templateId: `${TRADING_APP_TEMPLATE_PREFIX}:OTCTradeProposal`,
                    contractId: proposalCid1,
                    choice: 'OTCTradeProposal_Accept',
                    choiceArgument: { approver: alice.partyId },
                },
            },
        ],
        disclosedContracts: [],
        synchronizerId: globalSynchronizerId,
    })
    .sign(alice.keyPair.privateKey)
    .execute({ partyId: alice.partyId })
logger.info('Alice accepted OTCTradeProposal via P1 (app-user)')

// Bob accepts the updated proposal via P2
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

// Step 7c: TradingApp initiates settlement → creates OTCTrade.
// All parties have approved, so TradingApp can now initiate.
// OTCTrade will have signatory: venue + tradingParties (Alice, Bob).
const proposalCid3 = await readProposal(p3Sdk, tradingApp.partyId)
const prepareUntil = new Date(Date.now() + 1800 * 1000).toISOString()
const settleBefore = new Date(Date.now() + 3600 * 1000).toISOString()

await p3Sdk.ledger
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

logger.info('TradingApp initiated settlement → OTCTrade created via P3 (sv)')
logger.info('Contracts after step 7 (Proposal → Accept → InitiateSettlement):')
await logContracts(
    p3Sdk,
    logger,
    synchronizers,
    'OTCTrade',
    [`${TRADING_APP_TEMPLATE_PREFIX}:OTCTrade`],
    [tradingApp.partyId]
)

// ──────────────────────────────────────────────────────────
// 8. No separate "Request Allocations" step needed
//
//    In the V1 trading app, OTCTrade itself implements the
//    AllocationRequest interface. Trading parties can read
//    the OTCTrade contract directly and create allocations
//    for their legs. No separate OTCTradeAllocationRequest
//    contracts are created.
// ──────────────────────────────────────────────────────────

// Read the OTCTrade contract ID (TradingApp is stakeholder).
const otcTradeContracts = await p3Sdk.ledger.acs.read({
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
        // Step 9: Alice allocates Amulet for her leg (leg-0)
        //
        //    Unlike TestToken where TokenRules directly implements
        //    AllocationFactory (findable in ACS), Amulet's factory
        //    contract is not AmuletRules itself. We discover the
        //    correct factory by posting the choice args to the scan
        //    proxy's token-standard registry endpoint, which returns
        //    the factoryId and the disclosed contracts + context
        //    needed for the submission.
        //    Alice is hosted on P1 (app-user), so P1 queries and submits.
        (async () => {
            const pendingRequestsAlice =
                await tokenP1.allocation.request.pending(alice.partyId)
            const requestViewAlice = pendingRequestsAlice[0].interfaceViewValue!

            const legId = Object.keys(requestViewAlice.transferLegs).find(
                (key) =>
                    requestViewAlice.transferLegs[key].sender === alice.partyId
            )!
            if (!legId) throw new Error('No transfer leg found for Alice')

            // Read Alice's Amulet holding CID from ACS via P1 (Alice's hosting participant).
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

            // Build the allocation choice args (needed for the registry lookup)
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

            // Resolve the AllocationFactory contract via the scan proxy registry.
            // The registry returns the factoryId (the contract that implements
            // AllocationFactory for this instrument) along with the disclosed
            // contracts and choice context needed for the submission.
            const { factoryId, choiceContext } =
                await scanProxyClient.fetchAllocationFactory(
                    allocationChoiceArgs
                )

            // Apply context values from registry to the choice args
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

        // Step 10: Bob allocates TestToken for his leg (leg-1)
        //
        //     TestToken has no registry, so we manually exercise
        //     AllocationFactory_Allocate on the TokenRules contract
        //     (which implements the AllocationFactory interface).
        //     Bob is hosted on P2, so P2 queries and submits.
        //     P2 can read Bob's app-synchronizer contracts (Token, TokenRules)
        //     because Bob's party was created on P2.
        (async () => {
            const pendingRequestsBob = await tokenP2.allocation.request.pending(
                bob.partyId
            )
            const requestViewBob = pendingRequestsBob[0].interfaceViewValue!

            const legId = Object.keys(requestViewBob.transferLegs).find(
                (key) => requestViewBob.transferLegs[key].sender === bob.partyId
            )!
            if (!legId) throw new Error('No transfer leg found for Bob')

            // Read Bob's Token holding CID and TokenRules CID from ACS via P2.
            // Bob is hosted on P2, so P2's ledger-api-user has actAs: bob.partyId
            // and can read Bob's app-synchronizer contracts directly.
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
// 11. TradingApp: Settle the OTCTrade (single-party submit!)
//
//     The V1 trading app's OTCTrade has all trading parties as
//     signatories (added via the proposal-accept flow). When the
//     venue exercises OTCTrade_Settle, the Daml runtime provides
//     authority from all signatories (venue + Alice + Bob). This
//     is sufficient for Allocation_ExecuteTransfer which requires
//     [executor, sender, receiver] as controllers.
//
//     No multiPartySubmit needed — TradingApp (venue) submits alone!
//
//     Canton's transaction router automatically reassigns
//     contracts to a common synchronizer when needed. Bob's
//     TokenAllocation (on app-synchronizer) will be auto-
//     reassigned to the global synchronizer where the
//     OTCTrade lives.
//
//     P1 submits as TradingApp (cross-registered in step 3b).
//     P1 is connected to both synchronizers, which is required
//     for Canton's transaction router to handle the app-sync →
//     global reassignment of Bob's TestToken allocation.
//     Bob's allocation is disclosed from P2 (Bob's participant).
// ──────────────────────────────────────────────────────────

// Read Alice's allocation via P1 (her hosting participant).
const allocationsAlice = await tokenP1.allocation.pending(alice.partyId)
const amuletAllocation = allocationsAlice.find(
    (a) => a.interfaceViewValue.allocation.transferLegId === legIdAlice
)
if (!amuletAllocation) throw new Error('Amulet allocation not found')

// Read Bob's allocation via P2 (his hosting participant).
const allocationsBob = await tokenP2.allocation.pending(bob.partyId)
const testTokenAllocation = allocationsBob.find(
    (a) => a.interfaceViewValue.allocation.transferLegId === legIdBob
)
if (!testTokenAllocation) throw new Error('TestToken allocation not found')
const testTokenAllocationCid = testTokenAllocation.contractId

// Fetch execute-transfer choice context for the Amulet allocation from the
// scan proxy registry. Allocation_ExecuteTransfer on Amulet requires a
// non-empty context (e.g. external-party-config-state) that only the
// registry can provide, together with the disclosed contracts.
const amuletExecContext = await scanProxyClient.fetchExecuteTransferContext(
    amuletAllocation.contractId
)

// V1 TradingApp's OTCTrade_Settle takes a TextMap of (ContractId Allocation, ExtraArgs)
// keyed by legId. Daml tuples are encoded as { _1, _2 } in JSON.
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

// Disclosed contracts needed for settlement via P1 (as TradingApp):
// - Amulet system contracts from the scan proxy (for Amulet allocation execution)
// - Alice's Amulet allocation (P1 hosts Alice, so this is in P1's ACS — but
//   included for completeness as it may be needed by the engine)
// - Bob's TestToken allocation (on app-sync; P1 connects to app-sync but
//   doesn't host Bob, so we disclose from P2)
// Helper to convert an ACS contract to a disclosed-contract entry.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDisclosed = (c: any) => ({
    templateId: c.templateId as string,
    contractId: c.contractId as string,
    createdEventBlob: c.createdEventBlob as string,
    synchronizerId: c.synchronizerId as string,
})

// Read Alice's allocation for disclosure (P1 hosts Alice, but engine may need the blob).
const amuletAllocContracts = await p1Sdk.ledger.acs.read({
    interfaceIds: [
        '#splice-api-token-allocation-v1:Splice.Api.Token.AllocationV1:Allocation',
    ],
    parties: [alice.partyId],
    filterByParty: true,
})
const amuletAllocForDisclosure = amuletAllocContracts.find(
    (c) => c.contractId === amuletAllocation.contractId
)
if (!amuletAllocForDisclosure)
    throw new Error('Amulet allocation not found for disclosure')

// Read Bob's TestToken allocation for disclosure (P1 doesn't host Bob; disclose from P2).
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

const settlementDisclosedContracts = [
    ...(amuletExecContext.disclosedContracts ?? []),
    toDisclosed(amuletAllocForDisclosure),
    toDisclosed(bobAllocForDisclosure),
]

// Single-party submit! TradingApp (venue) exercises OTCTrade_Settle via P1.
// OTCTrade has signatory venue + tradingParties, so Allocation_ExecuteTransfer
// gets authority from all signatories — no extra authorizers needed.
// P1 connects to both synchronizers for cross-sync routing.
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
// 12. Alice: Transfer Token to app (private) synchronizer
//
//     After settlement Alice holds 20 TestToken on the
//     global synchronizer. Exercise TransferFactory_Transfer
//     as a self-transfer (Alice → Alice) targeting the
//     app-synchronizer. Canton's transaction router will
//     automatically reassign Alice's Token to the app-
//     synchronizer (where TokenRules lives) before executing.
//
//     TransferFactory_Transfer is controlled by transfer.sender
//     (Alice). TokenRules has signatory admin (Bob). Inside the
//     choice body, the combined authority (Alice + Bob) is
//     sufficient to create the new Token. Single-party submit!
//
//     We build the exercise command manually because the
//     registry doesn't know about custom TestToken — only
//     registered instruments have choice context there.
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

// Single-party submit by Alice via P1.
// TransferFactory_Transfer controller = transfer.sender (Alice).
// TokenRules signatory = admin (Bob) → provides Bob's authority inside the choice.
// Disclose TokenRules from P2 so P1's engine can resolve it.
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
