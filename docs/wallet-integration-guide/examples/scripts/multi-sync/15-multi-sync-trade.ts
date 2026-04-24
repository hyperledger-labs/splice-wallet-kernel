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
    multiPartySubmit,
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
//   P1  alice-participant       (port 2975) — global + app-synchronizer
//   P2  bob-participant         (port 3975) — global + app-synchronizer
//   P3  trading-app-participant (port 4975) — global + app-synchronizer
//
// Parties:
//   Alice      — holds Amulet (global sync), receives Token
//   Bob        — holds Token  (app-sync),    receives Amulet
//   TradingApp — orchestrates the OTC trade
//
//   Each party is hosted on its own dedicated participant:
//     Alice      → P1 (alice-participant)
//     Bob        → P2 (bob-participant)
//     TradingApp → P3 (trading-app-participant)
//
//   Canton's ACS query API and interactive-submission prepare API
//   both require the calling participant to host the party, so each
//   single-party step uses the party's dedicated participant.
//
//   Step 11 (multi-party settlement) requires a single participant to
//   call prepare for all three parties simultaneously. For this we
//   co-host Bob and TradingApp on P1 (alice-participant) after their
//   primary allocation. Canton supports multiple PartyToParticipant
//   entries for the same party; each participant submits its own entry
//   independently. Co-hosting is created in the correct order — each
//   party is created on its primary participant first, then P1 adds
//   the co-hosting entry — so there is no "Party already created" error.
//
// Synchronizers:
//   global          — Amulet instrument (Canton Coin / AmuletRules)
//   app-synchronizer — Token instrument (TestToken / TokenRules)
//
// Flow:
//   init:  create AmuletRules (global), create Amulet for Alice
//   init:  create TokenRules  (app-sync), create Token for Bob
//   (1)  Trading app: create OTCTrade → AllocationRequests created
//   (2)  Alice: exercise AllocationFactory_Allocate → AmuletAllocation (global)
//   (3)  Bob:   exercise AllocationFactory_Allocate → TokenAllocation  (app-sync)
//   (4)  Trading app: exercise OTCTrade_Settle
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
//   P1 alice-participant       (port 2975) — global + app-synchronizer
//   P2 bob-participant         (port 3975) — global + app-synchronizer
//   P3 trading-app-participant (port 4975) — global + app-synchronizer
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
const tokenP1 = p1Sdk.token // Alice and TradingApp hosted on P1
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

const TRADING_APP_V2_DAR = 'splice-token-test-trading-app-v2-1.0.0.dar'
const TEST_TOKEN_V1_DAR = 'splice-test-token-v1-1.0.0.dar'

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

await Promise.all([
    vetDar(p1SdkCtx.ledgerProvider, tradingAppV2DarBytes, globalSynchronizerId),
    vetDar(p1SdkCtx.ledgerProvider, testTokenV1DarBytes, globalSynchronizerId),
    vetDar(p2SdkCtx.ledgerProvider, tradingAppV2DarBytes, globalSynchronizerId),
    vetDar(p2SdkCtx.ledgerProvider, testTokenV1DarBytes, globalSynchronizerId),
    vetDar(p3SdkCtx.ledgerProvider, tradingAppV2DarBytes, globalSynchronizerId),
    vetDar(p3SdkCtx.ledgerProvider, testTokenV1DarBytes, globalSynchronizerId),
])
logger.info('All required DARs uploaded successfully to all 3 participants')

// ──────────────────────────────────────────────────────────
// 2c. Vet DARs on the App Synchronizer
//
//    All three participants are now connected to app-synchronizer
//    (P3/trading-app-participant was connected in the updated bootstrap
//    script — scripts/localnet/app-synchronizer.sc). Token/TokenRules
//    DARs must be vetted on app-synchronizer for every participant that
//    will process transactions on that synchronizer.
//
//    We check whether P3 is connected to app-synchronizer at runtime
//    to remain backward-compatible with localnet instances that were
//    started before the bootstrap script was updated.
// ──────────────────────────────────────────────────────────

const p3ConnectedSyncs = await p3Sdk.ledger.state.connectedSynchronizers({})
const p3OnAppSync =
    p3ConnectedSyncs.connectedSynchronizers?.some(
        (s: LedgerTypes['ConnectedSynchronizer']) =>
            s.synchronizerId === appSynchronizerId
    ) ?? false

const appSyncVetPromises = [
    vetDar(p1SdkCtx.ledgerProvider, tradingAppV2DarBytes, appSynchronizerId),
    vetDar(p1SdkCtx.ledgerProvider, testTokenV1DarBytes, appSynchronizerId),
    vetDar(p2SdkCtx.ledgerProvider, tradingAppV2DarBytes, appSynchronizerId),
    vetDar(p2SdkCtx.ledgerProvider, testTokenV1DarBytes, appSynchronizerId),
    ...(p3OnAppSync
        ? [
              vetDar(
                  p3SdkCtx.ledgerProvider,
                  tradingAppV2DarBytes,
                  appSynchronizerId
              ),
              vetDar(
                  p3SdkCtx.ledgerProvider,
                  testTokenV1DarBytes,
                  appSynchronizerId
              ),
          ]
        : []),
]
await Promise.all(appSyncVetPromises)
logger.info(
    p3OnAppSync
        ? 'All DARs vetted on app-synchronizer for all 3 participants'
        : 'All DARs vetted on app-synchronizer for P1 and P2 (P3 not yet connected — restart localnet to apply bootstrap changes)'
)

// ──────────────────────────────────────────────────────────
// 3. Allocate Parties (Alice, Bob, TradingApp)
//
//    All parties are hosted on P1 (alice-participant). Canton's
//    external-party API does not support adding a second host to an
//    already-existing party via party.external.create — the call
//    returns "Party already created" without adding the new
//    PartyToParticipant entry. As a result, the hosting participant
//    must be chosen at creation time and cannot be changed later.
//
//    Canton's ACS query API and interactive-submission prepare API
//    Each party is hosted on its natural participant:
//      Alice     → P1 (alice-participant)
//      Bob       → P2 (bob-participant)
//      TradingApp → P1 (alice-participant)
//
//    P1 hosts Alice and TradingApp; P2 hosts Bob. For multi-party
//    operations (step 11 settlement, step 12 transfer) P2 is the
//    coordinator — Alice and TradingApp actAs rights are granted on
//    P2 after party creation so P2 can prepare and sign for all three.
//
//    P2 (bob-participant) is connected to both synchronizers and
//    can read Bob's app-synchronizer contracts (Token, TokenRules).
//    P1 cannot read Bob's app-sync contracts via ACS (Canton external-
//    party limitation: P1 does not receive app-sync events for Bob).
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

// Allocate Alice and TradingApp on P1, Bob on P2 (each party's natural participant).
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
// 3b. Register parties on the App Synchronizer
//
//     All three parties transact on the app-synchronizer:
//       • Alice and Bob: Token/TokenRules operations (steps 6–10)
//       • TradingApp: informee of Token Allocation contracts
//         (AllocationFactory_Allocate on TokenRules lives on
//          app-synchronizer; TradingApp is a stakeholder of the
//          resulting Allocation contract)
//
//     Each party is registered through its primary hosting participant.
//     The registration propagates via the sequencer so all participants
//     see the updated PartySynchronizerDomainState topology.
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
    // Register TradingApp via P3 if it's connected to app-synchronizer,
    // otherwise use P1 (which co-hosts TradingApp after phase 2 of step 3).
    registerPartyOnSynchronizer(
        p3OnAppSync ? p3SdkCtx.ledgerProvider : p1SdkCtx.ledgerProvider,
        tradingApp,
        appSynchronizerId
    ),
])
logger.info(
    p3OnAppSync
        ? 'Alice, Bob, and TradingApp registered on app-synchronizer via their respective participants'
        : 'Alice, Bob, and TradingApp registered on app-synchronizer (TradingApp via P1 — P3 not yet on app-sync)'
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

// All parties are hosted on P1 (alice-participant), so P1 submits.
await p1Sdk.ledger
    .prepare({
        partyId: tradingApp.partyId,
        commands: createTrade,
        disclosedContracts: [],
        synchronizerId: globalSynchronizerId,
    })
    .sign(tradingApp.keyPair.privateKey)
    .execute({ partyId: tradingApp.partyId })

logger.info(
    'OTCTrade created by TradingApp via P1 (alice-participant):\n' +
        '    Leg 0: Alice -> Bob (100 Amulet)\n' +
        '    Leg 1: Bob -> Alice (20 TestToken)'
)
logger.info('Contracts after step 7 (Create Trade):')
await logContracts(
    p1Sdk,
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

// All parties are hosted on P1, so P1 reads the OTCTrade.
const otcTradeContracts = await p1Sdk.ledger.acs.read({
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

// All parties are hosted on P1, so P1 submits.
await p1Sdk.ledger
    .prepare({
        partyId: tradingApp.partyId,
        commands: requestAllocationsCmd,
        disclosedContracts: [],
        synchronizerId: globalSynchronizerId,
    })
    .sign(tradingApp.keyPair.privateKey)
    .execute({ partyId: tradingApp.partyId })

logger.info(
    'TradingApp: Allocation requests created via P1 (alice-participant)'
)
logger.info('Contracts after step 8 (Request Allocations):')
await logContracts(
    p1Sdk,
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
        //    Alice is hosted on P1 (alice-participant), so P1 queries and submits.
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
                'Bob: TestToken allocation created via P2 (bob-participant, leg-1, on app-synchronizer)'
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
// 11. Trading App: Settle the OTCTrade
//
//     Canton's transaction router automatically reassigns
//     contracts to a common synchronizer when needed. Bob's
//     TokenAllocation (on app-synchronizer) will be auto-
//     reassigned to the global synchronizer where the
//     OTCTrade lives.
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
//     P2 (bob-participant) is the settlement coordinator: it has actAs
//     for all three parties after the cross-party grant in section 3b.
//     P2 hosts Bob → it has Bob's TestToken allocation in its local ACS
//     (on app-synchronizer). Canton's transaction router automatically
//     reassigns it to global-domain before executing the settlement.
//     The OTCTrade and Alice's AllocationRequest are not visible to P2
//     (TradingApp/Alice are stakeholders, hosted on P1), so they are
//     disclosed from P1's ACS. All disclosures are on global-domain
//     (no synchronizer mismatch).
// ──────────────────────────────────────────────────────────

// Read Alice's allocation via P1 (her hosting participant).
const allocationsAlice = await tokenP1.allocation.pending(alice.partyId)
const amuletAllocation = allocationsAlice.find(
    (a) => a.interfaceViewValue.allocation.transferLegId === legIdAlice
)
if (!amuletAllocation) throw new Error('Amulet allocation not found')

// Read Bob's allocation via P2 (his hosting participant — P1 cannot see
// Bob's app-synchronizer contracts, Canton external-party limitation).
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

// Read the OTCTrade contract from P1 for disclosure to P2.
// The OTCTrade only has TradingApp as a Daml-level stakeholder (Alice and Bob
// are party-valued fields, not signatories/observers at the Daml level), so
// P2 (bob-participant) cannot see it in its local ACS. Disclosing it enables
// P2 to prepare the settlement transaction.
const otcTradeForDisclosure = await p1Sdk.ledger.acs.read({
    templateIds: [`${TRADING_APP_V2_TEMPLATE_PREFIX}:OTCTrade`],
    parties: [tradingApp.partyId],
    filterByParty: true,
})
const otcTradeContract = otcTradeForDisclosure[0]
if (!otcTradeContract) throw new Error('OTCTrade not found on P1')

// Read allocation request CIDs to archive during settlement via P1.
// TradingApp is a stakeholder of all allocation requests, so P1 can read them.
// Alice's AllocationRequest is not visible to P2 (Alice is hosted on P1),
// so disclose it alongside the OTCTrade.
const allocationRequestContracts = await p1Sdk.ledger.acs.read({
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
// Bob's TestToken allocation (on app-synchronizer) is NOT disclosed here;
// P2 resolves it from its local ACS and Canton reassigns it to global-domain.
//
// Alice's Amulet allocation is on global-domain but is only visible to P1
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
// OTCTrade and AllocationRequests (global-domain) are disclosed from P1.
// Bob's TestToken allocation (app-sync) is resolved from P2's local ACS;
// Canton reassigns it to global-domain automatically.
await multiPartySubmit(p2Sdk, p2SdkCtx.ledgerProvider, p2SdkCtx.userId, {
    commands: settleCmd,
    actAs: [tradingApp.partyId, alice.partyId, bob.partyId],
    disclosedContracts: settlementDisclosedContracts,
    synchronizerId: globalSynchronizerId,
    signers: [
        { partyId: tradingApp.partyId, keyPair: tradingApp.keyPair },
        { partyId: alice.partyId, keyPair: alice.keyPair },
        { partyId: bob.partyId, keyPair: bob.keyPair },
    ],
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
// 12. Alice: Transfer Token to app (private) synchronizer
//
//     After settlement Alice holds 20 TestToken on the
//     global synchronizer. Exercise TransferFactory_Transfer
//     as a self-transfer (Alice → Alice) targeting the
//     app-synchronizer. Canton's transaction router will
//     automatically reassign Alice's Token to the app-
//     synchronizer (where TokenRules lives) before executing.
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

// Exercise TransferFactory_Transfer on app-synchronizer.
// Canton will auto-reassign Alice's Token from global -> app-synchronizer.
//
// Alice needs readAs: [bob.partyId] to see the TokenRules contract
// (Bob is the admin/signatory). The public p1Sdk.ledger.prepare doesn't
// support readAs, so we use multiPartySubmit.
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

await multiPartySubmit(p1Sdk, p1SdkCtx.ledgerProvider, p1SdkCtx.userId, {
    commands: [{ ExerciseCommand: transferExercise }],
    actAs: [alice.partyId, bob.partyId],
    readAs: [bob.partyId],
    // Disclose TokenRules from P2 — P1 cannot see Bob's app-sync contracts.
    disclosedContracts: [
        {
            templateId: tokenRulesContract!.templateId!,
            contractId: tokenRulesCid,
            createdEventBlob: tokenRulesContract!.createdEventBlob!,
            synchronizerId: tokenRulesContract!.synchronizerId,
        },
    ],
    synchronizerId: appSynchronizerId,
    signers: [
        { partyId: alice.partyId, keyPair: alice.keyPair },
        { partyId: bob.partyId, keyPair: bob.keyPair },
    ],
})

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
