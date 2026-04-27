import pino from 'pino'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import {
    localNetStaticConfig,
    SDK,
    signTransactionHash,
    vetPackage,
} from '@canton-network/wallet-sdk'
import {
    TOKEN_NAMESPACE_CONFIG,
    TOKEN_PROVIDER_CONFIG_DEFAULT,
    logContracts,
    registerPartyOnSynchronizer,
    resolvePreferredSynchronizerId,
    createScanProxyClient,
    pollUntilNonEmpty,
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
//   P1  app-user-participant     (port 2975) — global + app-synchronizer
//   P2  app-provider-participant (port 3975) — global + app-synchronizer
//   P3  sv-participant           (port 4975) — global synchronizer only
//
// Parties:
//   Alice      — holds Amulet (global sync), receives Token
//   Bob        — holds Token  (app-sync),    receives Amulet
//   TradingApp — orchestrates the OTC trade
//
//   Each party is hosted on its own dedicated participant:
//     Alice      → P1 (app-user-participant)
//     Bob        → P2 (app-provider-participant)
//     TradingApp → P3 (sv-participant, global-sync only)
//
//   Canton's ACS query API and interactive-submission prepare API
//   both require the calling participant to host the party, so each
//   single-party step uses the party's dedicated participant.
//
//   Step 11 (settlement): P2 coordinates — Alice and TradingApp actAs
//   rights are granted on P2 so it can sign for all three parties.
//   Step 12 (token transfer): P1 coordinates — Bob actAs rights are
//   granted on P1 so it can sign as TokenRules admin.
//
// Synchronizers:
//   global           — Amulet instrument (Canton Coin / AmuletRules)
//   app-synchronizer — Token instrument (TestToken / TokenRules)
//
// Flow:
//   init:  create AmuletRules (global), create Amulet for Alice
//   init:  create TokenRules  (app-sync), create Token for Bob
//   (1)  Trading app: create OTCTrade → AllocationRequests created
//   (2)  Alice: exercise AllocationFactory_Allocate → AmuletAllocation (global)
//   (3)  Bob:   exercise AllocationFactory_Allocate → TokenAllocation  (global)
//          • Canton auto-reassigns Token & TokenRules (app-sync → global)
//          • TradingApp (P3, global-sync only) is a stakeholder of the
//            resulting Allocation — must be on global-sync
//   (4)  Trading app: exercise OTCTrade_Settle
//          • All allocations already on global-sync — no reassignment needed
//          • exercise Allocation_ExecuteTransfer for both legs
//          → Amulet created for Bob (global)
//          → Token created for Alice (global)
//   later: Alice exercises TransferFactory_Transfer → Token stays on global-sync
//
// ══════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────
// 1. SDK Initialization
//
// Three participant nodes, each dedicated to one party:
//   P1 app-user-participant     (port 2975) — global + app-synchronizer
//   P2 app-provider-participant (port 3975) — global + app-synchronizer
//   P3 sv-participant           (port 4975) — global synchronizer only
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
//    P1 and P2 are connected to both synchronizers; P3 (sv-participant)
//    is connected to global-sync only. We query P1 to discover
//    synchronizer IDs; they are the same across participants
//    (sequencer-assigned, not per-participant).
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

const TRADING_APP_V2_DAR = 'splice-token-test-trading-app-v2-1.0.0.dar'
const TEST_TOKEN_V1_DAR = 'splice-test-token-v1-1.0.0.dar'
// Main package IDs (from Main-Dalf hash in each DAR's META-INF/MANIFEST.MF).
const TRADING_APP_V2_PACKAGE_ID =
    '352e2ac9b1f0819cc526a061bbdbf4317b5f1c4e15fa4478baa539a263d404bd'
const TEST_TOKEN_V1_PACKAGE_ID =
    'ac2ed8e38a081e8a4aaf065f476820f682522e1157ce85a8ff0ce45d81154e0c'

const tradingAppV2DarPath = path.join(here, TRADING_APP_V2_DAR)
const testTokenV1DarPath = path.join(here, TEST_TOKEN_V1_DAR)

// Guard: verify both DARs are present before proceeding.
for (const [darPath, darName] of [
    [tradingAppV2DarPath, TRADING_APP_V2_DAR],
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

const [tradingAppV2DarBytes, testTokenV1DarBytes] = await Promise.all([
    fs.readFile(tradingAppV2DarPath),
    fs.readFile(testTokenV1DarPath),
])

// Upload DAR bytes on global-sync for all three participants, then vet on
// app-sync for P1 and P2 only. P3 (sv-participant) is connected to
// global-sync only — no app-sync vetting is needed for P3.
await Promise.all([
    p1Sdk.ledger.dar.upload(
        tradingAppV2DarBytes,
        TRADING_APP_V2_PACKAGE_ID,
        globalSynchronizerId
    ),
    p1Sdk.ledger.dar.upload(
        testTokenV1DarBytes,
        TEST_TOKEN_V1_PACKAGE_ID,
        globalSynchronizerId
    ),
    p2Sdk.ledger.dar.upload(
        tradingAppV2DarBytes,
        TRADING_APP_V2_PACKAGE_ID,
        globalSynchronizerId
    ),
    p2Sdk.ledger.dar.upload(
        testTokenV1DarBytes,
        TEST_TOKEN_V1_PACKAGE_ID,
        globalSynchronizerId
    ),
    p3Sdk.ledger.dar.upload(
        tradingAppV2DarBytes,
        TRADING_APP_V2_PACKAGE_ID,
        globalSynchronizerId
    ),
    p3Sdk.ledger.dar.upload(
        testTokenV1DarBytes,
        TEST_TOKEN_V1_PACKAGE_ID,
        globalSynchronizerId
    ),
])
await Promise.all([
    vetPackage(
        p1SdkCtx.ledgerProvider,
        tradingAppV2DarBytes,
        appSynchronizerId
    ),
    vetPackage(p1SdkCtx.ledgerProvider, testTokenV1DarBytes, appSynchronizerId),
    vetPackage(
        p2SdkCtx.ledgerProvider,
        tradingAppV2DarBytes,
        appSynchronizerId
    ),
    vetPackage(p2SdkCtx.ledgerProvider, testTokenV1DarBytes, appSynchronizerId),
])
logger.info(
    'All required DARs uploaded on global-sync (P1, P2, P3) and vetted on app-sync (P1, P2); ' +
        'P3 (sv-participant) is global-sync only \u2014 no app-sync vetting needed'
)

// ──────────────────────────────────────────────────────────
// 3. Allocate Parties (Alice, Bob, TradingApp)
//
//    Each party is hosted on its dedicated participant node:
//      Alice      → P1 (app-user-participant,     global + app-sync)
//      Bob        → P2 (app-provider-participant, global + app-sync)
//      TradingApp → P3 (sv-participant,           global-sync only)
//
//    Canton's external-party API does not support adding a second host
//    to an already-existing party — the call returns "Party already
//    created" without adding a new PartyToParticipant entry. The
//    hosting participant must be chosen at creation time.
//
//    For multi-party settlement (step 11), P2 is the coordinator —
//    Alice and TradingApp actAs rights are granted on P2 so it can
//    prepare and sign for all three parties simultaneously.
//
//    For the token self-transfer (step 12), P1 is the coordinator —
//    Bob actAs rights are granted on P1 (TokenRules has Bob as admin).
//
//    P2 (app-provider-participant) is on both synchronizers and can read
//    Bob's app-synchronizer contracts (Token, TokenRules). P1 cannot
//    read Bob's app-sync contracts via ACS (Canton external-party
//    limitation: P1 does not receive app-sync events for Bob).
//
//    The synchronizerId is passed explicitly: when a participant is
//    connected to multiple synchronizers the SDK defaults to the first
//    one returned by the API, so we must be explicit.
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

// Allocate Alice on P1, Bob on P2, TradingApp on P3 (each party's dedicated participant).
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
// 3b. Register Alice and Bob on the App Synchronizer
//
//     Alice and Bob transact on the app-synchronizer (Token/TokenRules
//     operations in steps 6–10). Each party is registered through its
//     primary hosting participant.
//
//     TradingApp is NOT registered on the app-synchronizer — P3
//     (sv-participant) is connected to global-sync only. Bob's TestToken
//     Allocation (step 10) is created on global-sync so that TradingApp
//     can act as a stakeholder without requiring any app-sync presence.
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
])
logger.info(
    'Alice and Bob registered on app-synchronizer (TradingApp is global-sync only)'
)

// Grant Alice and TradingApp actAs rights on P2 so P2 can coordinate
// multi-party settlement (step 11) as all three parties simultaneously.
await p2Sdk.user.rights.grant({
    userRights: { actAs: [alice.partyId, tradingApp.partyId] },
})
// Grant Bob actAs rights on P1 so P1 can coordinate the Token transfer
// (step 12) with actAs: [alice, bob]. TokenRules has Bob as admin so
// Bob's authorization is required for TransferFactory_Transfer.
await p1Sdk.user.rights.grant({
    userRights: { actAs: [bob.partyId] },
})
logger.info(
    'Cross-party rights granted:\n' +
        '    P2 (bob-participant) can now actAs Alice and TradingApp (for settlement)\n' +
        '    P1 (alice-participant) can now actAs Bob (for token transfer)'
)

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
    //     Bob is the admin and is hosted on P2, so P2 (bob-participant) submits.
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
            'TokenRules created by Bob via P2 (bob-participant, on app-synchronizer)'
        )
    })(),

    // Step 6b: Mint Token holding for Bob on the App (private) Synchronizer
    //
    //     Bob is both the owner and the instrumentId.admin of
    //     the Token, so he is the sole signatory and a simple
    //     single-party prepare/sign/execute is sufficient.
    //     The Token holding lives on the app-synchronizer.
    //     Bob is hosted on P2, so P2 (bob-participant) submits.
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
            'Bob: Token holding minted via P2 (bob-participant, 500 TestToken, on app-synchronizer)'
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
        instrumentId: { admin: amuletAdmin, id: 'Amulet' },
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

// TradingApp is hosted on P3 (sv-participant, global-sync only), so P3 submits.
await p3Sdk.ledger
    .prepare({
        partyId: tradingApp.partyId,
        commands: createTrade,
        disclosedContracts: [],
        synchronizerId: globalSynchronizerId,
    })
    .sign(tradingApp.keyPair.privateKey)
    .execute({ partyId: tradingApp.partyId })

logger.info(
    'OTCTrade created by TradingApp via P3 (sv-participant):\n' +
        '    Leg 0: Alice -> Bob (100 Amulet)\n' +
        '    Leg 1: Bob -> Alice (20 TestToken)'
)
logger.info('Contracts after step 7 (Create Trade):')
await logContracts(
    p3Sdk,
    logger,
    synchronizers,
    'OTCTrade',
    [`${TRADING_APP_V2_TEMPLATE_PREFIX}:OTCTrade`],
    [tradingApp.partyId]
)

// ──────────────────────────────────────────────────────────
// 8. Trading App: Request Allocations from OTCTrade
//
//    The venue exercises OTCTrade_RequestAllocations which
//    creates OTCTradeAllocationRequest contracts — one per
//    trading party. Each trader then sees the request and
//    responds by creating an allocation for their leg.
// ──────────────────────────────────────────────────────────

// TradingApp is hosted on P3 (sv-participant), so P3 reads the OTCTrade.
const otcTradeContracts = await p3Sdk.ledger.acs.read({
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

// TradingApp is hosted on P3 (sv-participant), so P3 submits.
await p3Sdk.ledger
    .prepare({
        partyId: tradingApp.partyId,
        commands: requestAllocationsCmd,
        disclosedContracts: [],
        synchronizerId: globalSynchronizerId,
    })
    .sign(tradingApp.keyPair.privateKey)
    .execute({ partyId: tradingApp.partyId })

logger.info('TradingApp: Allocation requests created via P3 (sv-participant)')
logger.info('Contracts after step 8 (Request Allocations):')
await logContracts(
    p3Sdk,
    logger,
    synchronizers,
    'AllocationRequests',
    [`${TRADING_APP_V2_TEMPLATE_PREFIX}:OTCTradeAllocationRequest`],
    [tradingApp.partyId]
)

// ──────────────────────────────────────────────────────────
// 9 + 10 (parallel)
//
//   Step 9:  Alice allocates Amulet for leg-0 (global sync)
//   Step 10: Bob allocates TestToken for leg-1 (global sync)
//            Canton auto-reassigns Token & TokenRules from
//            app-sync to global-sync for this submission.
//            TradingApp (P3, global-sync only) is a stakeholder
//            of the resulting Allocation — must be on global-sync.
//
//   These allocations are independent and can run concurrently.
// ──────────────────────────────────────────────────────────

const ALLOCATION_FACTORY_INTERFACE_ID =
    '#splice-api-token-allocation-instruction-v1:Splice.Api.Token.AllocationInstructionV1:AllocationFactory'

const [legIdAlice, { legId: legIdBob, tokenRulesCid }] = await Promise.all([
    // Step 9: Alice allocates Amulet for her leg (leg-0)
    //
    //    Unlike TestToken where TokenRules directly implements
    //    AllocationFactory (findable in ACS), Amulet's factory
    //    contract is not AmuletRules itself. We discover the
    //    correct factory by posting the choice args to the scan
    //    proxy's token-standard registry endpoint, which returns
    //    the factoryId and the disclosed contracts + context
    //    needed for the submission.
    //    Alice is hosted on P1 (alice-participant), so P1 queries and submits.
    (async () => {
        const pendingRequestsAlice = await pollUntilNonEmpty(
            () => tokenP1.allocation.request.pending(alice.partyId),
            'allocation request for Alice on P1'
        )
        const requestViewAlice = pendingRequestsAlice[0].interfaceViewValue!

        const legId = Object.keys(requestViewAlice.transferLegs).find(
            (key) => requestViewAlice.transferLegs[key].sender === alice.partyId
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
            await scanProxyClient.fetchAllocationFactory(allocationChoiceArgs)

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
    //     Bob is hosted on P2, so P2 queries and submits on global-sync.
    //     Canton auto-reassigns Token and TokenRules from app-sync to
    //     global-sync for this submission. TradingApp (P3, global-sync
    //     only) is a stakeholder of the resulting Allocation — it must
    //     be on the same synchronizer as the Allocation.
    (async () => {
        const pendingRequestsBob = await pollUntilNonEmpty(
            () => tokenP2.allocation.request.pending(bob.partyId),
            'allocation request for Bob on P2'
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
        if (!tokenHoldingCid) throw new Error('Token holding not found for Bob')

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
                synchronizerId: globalSynchronizerId,
            })
            .sign(bob.keyPair.privateKey)
            .execute({ partyId: bob.partyId })

        logger.info(
            'Bob: TestToken allocation created via P2 (bob-participant, leg-1, on global-synchronizer)'
        )
        return { legId, tokenRulesCid }
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
// 11. Trading App: Settle the OTCTrade
//
//     Bob's TestToken Allocation was created on global-sync in step 10
//     (TradingApp is a stakeholder and P3 is global-sync only, so the
//     Allocation must be on global-sync). All allocations are therefore
//     already on global-sync — no auto-reassignment is needed.
//
//     OTCTrade_Settle internally exercises Allocation_ExecuteTransfer
//     for each allocation, which:
//       • Transfers 100 Amulet from Alice to Bob (new Amulet contract)
//       • Transfers 20 TestToken from Bob to Alice (new Token contract)
//
//     V1 settlement requires sender+receiver authority for
//     Allocation_ExecuteTransfer, so Alice and Bob are added
//     as extraSettlementAuthorizers (multi-party signing).
//
//     P2 (app-provider-participant) is the settlement coordinator: it has
//     actAs for all three parties after the cross-party grant in section 3b.
//     The OTCTrade and AllocationRequests are not visible to P2
//     (TradingApp is the only stakeholder, hosted on P3), so they are
//     disclosed from P3's ACS. Alice's Amulet Allocation is hosted on
//     P1 and also disclosed. All disclosures are on global-domain.
// ──────────────────────────────────────────────────────────

// Read Alice's allocation via P1 (her hosting participant).
const allocationsAlice = await tokenP1.allocation.pending(alice.partyId)
const amuletAllocation = allocationsAlice.find(
    (a) => a.interfaceViewValue.allocation.transferLegId === legIdAlice
)
if (!amuletAllocation) throw new Error('Amulet allocation not found')

// Read Bob's allocation via P2 (his hosting participant). Bob's TestToken
// Allocation is on global-sync (created there in step 10).
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

// Read the OTCTrade contract from P3 for disclosure to P2.
// The OTCTrade only has TradingApp as a Daml-level stakeholder (Alice and Bob
// are party-valued fields, not signatories/observers at the Daml level), so
// P2 (app-provider-participant) cannot see it in its local ACS. Disclosing it
// enables P2 to prepare the settlement transaction.
const otcTradeForDisclosure = await p3Sdk.ledger.acs.read({
    templateIds: [`${TRADING_APP_V2_TEMPLATE_PREFIX}:OTCTrade`],
    parties: [tradingApp.partyId],
    filterByParty: true,
})
const otcTradeContract = otcTradeForDisclosure[0]
if (!otcTradeContract) throw new Error('OTCTrade not found on P3')

// Read allocation request CIDs to archive during settlement via P3.
// TradingApp is a stakeholder of all allocation requests, so P3 can read them.
// Alice's AllocationRequest is not visible to P2 (Alice is hosted on P1),
// so disclose it alongside the OTCTrade.
const allocationRequestContracts = await p3Sdk.ledger.acs.read({
    templateIds: [
        `${TRADING_APP_V2_TEMPLATE_PREFIX}:OTCTradeAllocationRequest`,
    ],
    parties: [tradingApp.partyId],
    filterByParty: true,
})
const allocationRequestCids = allocationRequestContracts.map(
    (c) => c.contractId
)

// Helper to convert an ACS contract to a disclosed-contract entry.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDisclosed = (c: any) => ({
    templateId: c.templateId as string,
    contractId: c.contractId as string,
    createdEventBlob: c.createdEventBlob as string,
    synchronizerId: c.synchronizerId as string,
})

// All disclosed contracts are on global-domain (no synchronizer mismatch).
// Bob's TestToken Allocation is on global-domain (created there in step 10);
// P2 resolves it directly from its local ACS — no auto-reassignment needed.
//
// Alice's Amulet Allocation is on global-domain but only visible to P1
// (Alice is hosted on P1). Disclose it so P2's engine can resolve it.
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

const settlementDisclosedContracts = [
    ...(amuletExecContext.disclosedContracts ?? []),
    toDisclosed(otcTradeContract),
    ...allocationRequestContracts.map(toDisclosed),
    toDisclosed(amuletAllocForDisclosure),
]

// Build SettlementBatchV1 per instrument admin
// Map.Map in Daml JSON is encoded as [[key, value], ...]
const batchesByAdmin = [
    [
        amuletAdmin,
        {
            tag: 'SettlementBatchV1',
            value: {
                allocationsWithContext: {
                    [legIdAlice]: {
                        _1: amuletAllocation.contractId,
                        _2: {
                            context: {
                                ...(amuletExecContext.choiceContextData ?? {}),
                                values:
                                    (amuletExecContext.choiceContextData
                                        ?.values as Record<string, unknown>) ??
                                    {},
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

// Multi-party signing: P2 coordinates (has actAs for alice, bob, tradingApp
// after cross-party grants in section 3b). P2 connects to global + app-sync.
// OTCTrade and AllocationRequests (global-domain) are disclosed from P3.
// Bob's TestToken Allocation (global-domain, from step 10) is resolved from
// P2's local ACS — already on global-domain, no reassignment needed.
const settlePrepared = await p2Sdk.ledger.internal.prepare({
    commands: settleCmd,
    actAs: [tradingApp.partyId, alice.partyId, bob.partyId],
    readAs: [],
    disclosedContracts: settlementDisclosedContracts,
    synchronizerId: globalSynchronizerId,
})
const settleTxHash = settlePrepared.preparedTransactionHash
if (!settleTxHash)
    throw new Error('Settlement prepare returned no transaction hash')
const settleSignatures = [
    { partyId: tradingApp.partyId, keyPair: tradingApp.keyPair },
    { partyId: alice.partyId, keyPair: alice.keyPair },
    { partyId: bob.partyId, keyPair: bob.keyPair },
].map(({ partyId, keyPair }) => ({
    party: partyId,
    signatures: [
        {
            signature: signTransactionHash(settleTxHash, keyPair.privateKey),
            signedBy: partyId.split('::')[1],
            format: 'SIGNATURE_FORMAT_CONCAT',
            signingAlgorithmSpec: 'SIGNING_ALGORITHM_SPEC_ED25519',
        },
    ],
}))
await p2SdkCtx.ledgerProvider.request({
    method: 'ledgerApi',
    params: {
        resource: '/v2/interactive-submission/executeAndWait',
        requestMethod: 'post',
        body: {
            userId: p2SdkCtx.userId,
            preparedTransaction: settlePrepared.preparedTransaction,
            hashingSchemeVersion: 'HASHING_SCHEME_VERSION_V2',
            submissionId: crypto.randomUUID(),
            deduplicationPeriod: { Empty: {} },
            partySignatures: { signatures: settleSignatures },
        },
    },
})

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
// 12. Alice: Self-transfer Token on the global synchronizer
//
//     P3 (sv-participant) is global-sync only, so Bob's TestToken
//     Allocation was created on global-sync (step 10). Alice therefore
//     receives her Token on global-sync after settlement.
//
//     TokenRules was auto-reassigned from app-sync to global-sync
//     during step 10's AllocationFactory_Allocate submission. We
//     re-read it from P2 to obtain the current synchronizerId before
//     disclosing it to P1 for the TransferFactory_Transfer submission.
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

// After step 10's AllocationFactory_Allocate on global-sync, Canton
// auto-reassigned TokenRules from app-sync to global-sync. Re-read from P2
// (Bob's host) to get the updated ACS entry with synchronizerId=global.
const tokenRulesContractsGlobal = await p2Sdk.ledger.acs.read({
    templateIds: [`${TEST_TOKEN_TEMPLATE_PREFIX}:TokenRules`],
    parties: [bob.partyId],
    filterByParty: true,
})
const tokenRulesContractGlobal = tokenRulesContractsGlobal[0]
if (!tokenRulesContractGlobal)
    throw new Error(
        'TokenRules not found on P2 after step 10 (expected on global-synchronizer)'
    )

// Exercise TransferFactory_Transfer on the global synchronizer.
// Both Alice's Token and TokenRules are on global-sync after settlement.
//
// Alice needs actAs: [alice, bob] — Bob is the TokenRules admin/signatory.
// P1 is the coordinator: it has actAs Bob (granted in section 3b) and
// has Alice's Token in its local ACS (Alice is hosted on P1).
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

const transferPrepared = await p1Sdk.ledger.internal.prepare({
    commands: [{ ExerciseCommand: transferExercise }],
    actAs: [alice.partyId, bob.partyId],
    readAs: [bob.partyId],
    // Disclose TokenRules from P2 (now on global-sync after step 10
    // auto-reassignment; synchronizerId must match the submission synchronizer).
    disclosedContracts: [
        {
            templateId: tokenRulesContractGlobal.templateId!,
            contractId: tokenRulesCid,
            createdEventBlob: tokenRulesContractGlobal.createdEventBlob!,
            synchronizerId: tokenRulesContractGlobal.synchronizerId,
        },
    ],
    synchronizerId: globalSynchronizerId,
})
const transferTxHash = transferPrepared.preparedTransactionHash
if (!transferTxHash)
    throw new Error('Transfer prepare returned no transaction hash')
const transferSignatures = [
    { partyId: alice.partyId, keyPair: alice.keyPair },
    { partyId: bob.partyId, keyPair: bob.keyPair },
].map(({ partyId, keyPair }) => ({
    party: partyId,
    signatures: [
        {
            signature: signTransactionHash(transferTxHash, keyPair.privateKey),
            signedBy: partyId.split('::')[1],
            format: 'SIGNATURE_FORMAT_CONCAT',
            signingAlgorithmSpec: 'SIGNING_ALGORITHM_SPEC_ED25519',
        },
    ],
}))
await p1SdkCtx.ledgerProvider.request({
    method: 'ledgerApi',
    params: {
        resource: '/v2/interactive-submission/executeAndWait',
        requestMethod: 'post',
        body: {
            userId: p1SdkCtx.userId,
            preparedTransaction: transferPrepared.preparedTransaction,
            hashingSchemeVersion: 'HASHING_SCHEME_VERSION_V2',
            submissionId: crypto.randomUUID(),
            deduplicationPeriod: { Empty: {} },
            partySignatures: { signatures: transferSignatures },
        },
    },
})

logger.info(
    'Alice: TestToken self-transferred on global-synchronizer via TransferFactory_Transfer'
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
