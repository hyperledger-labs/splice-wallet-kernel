import pino from 'pino'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import { localNetStaticConfig, SDK } from '@canton-network/wallet-sdk'
import {
    TOKEN_NAMESPACE_CONFIG,
    TOKEN_PROVIDER_CONFIG_DEFAULT,
    AMULET_NAMESPACE_CONFIG,
    ASSET_CONFIG,
    logContracts,
    registerPartyOnSynchronizer,
    multiPartySubmit,
    resolvePreferredSynchronizerId,
} from '../utils/index.js'
import type { PartyInfo, SynchronizerMap } from '../utils/index.js'
import type { LedgerTypes } from '@canton-network/wallet-sdk'
import {
    LOCALNET_APP_PROVIDER_LEDGER_URL,
    LOCALNET_SV_LEDGER_URL,
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
// Parties (all hosted on P1 for now):
//   Alice      — holds Amulet (global sync), receives Token
//   Bob        — holds Token  (app-sync),    receives Amulet
//   Trading App — orchestrates the OTC trade
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
// Three participant nodes:
//   P1 (app-user,     port 2975) — connected to global + app-synchronizer
//   P2 (app-provider, port 3975) — connected to global + app-synchronizer
//   P3 (sv,           port 4975) — connected to global synchronizer only
//
// For now all 3 participants host the same 3 parties (Alice, Bob, TradingApp).
// TODO: Once the example evolves, split parties across participants
//       (e.g. Alice on P1, Bob on P2, TradingApp on P3).
// ──────────────────────────────────────────────────────────

const [p1Sdk, p2Sdk, p3Sdk] = await Promise.all([
    SDK.create({
        auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
        token: TOKEN_NAMESPACE_CONFIG,
        amulet: AMULET_NAMESPACE_CONFIG,
        asset: ASSET_CONFIG,
    }),
    SDK.create({
        auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: LOCALNET_APP_PROVIDER_LEDGER_URL,
        token: TOKEN_NAMESPACE_CONFIG,
        amulet: AMULET_NAMESPACE_CONFIG,
        asset: ASSET_CONFIG,
    }),
    SDK.create({
        auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: LOCALNET_SV_LEDGER_URL,
        token: TOKEN_NAMESPACE_CONFIG,
        amulet: AMULET_NAMESPACE_CONFIG,
        asset: ASSET_CONFIG,
    }),
])

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p1SdkCtx = (p1Sdk.ledger as any).sdkContext
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p3SdkCtx = (p3Sdk.ledger as any).sdkContext
void p3SdkCtx // connected to global only; reserved for future party splits

const token = p1Sdk.token
const amulet = p1Sdk.amulet
const asset = p1Sdk.asset

// ──────────────────────────────────────────────────────────
// 2. Discover Connected Synchronizers (global + private)
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

const tradingAppV2PackageId =
    p1Sdk.ledger.dar.extractPackageId(tradingAppV2DarBytes)
const testTokenV1PackageId =
    p1Sdk.ledger.dar.extractPackageId(testTokenV1DarBytes)

await Promise.all([
    p1Sdk.ledger.dar.upload(tradingAppV2DarBytes, tradingAppV2PackageId),
    p1Sdk.ledger.dar.upload(testTokenV1DarBytes, testTokenV1PackageId),
    p2Sdk.ledger.dar.upload(tradingAppV2DarBytes, tradingAppV2PackageId),
    p2Sdk.ledger.dar.upload(testTokenV1DarBytes, testTokenV1PackageId),
    p3Sdk.ledger.dar.upload(tradingAppV2DarBytes, tradingAppV2PackageId),
    p3Sdk.ledger.dar.upload(testTokenV1DarBytes, testTokenV1PackageId),
])
logger.info('All required DARs uploaded successfully to all 3 participants')

// ──────────────────────────────────────────────────────────
// 2c. Vet DARs on the App Synchronizer
// P3 (sv) is connected to global only — no vetting on app-synchronizer.
// ──────────────────────────────────────────────────────────

await Promise.all([
    p1Sdk.ledger.dar.vet(tradingAppV2DarBytes, appSynchronizerId),
    p1Sdk.ledger.dar.vet(testTokenV1DarBytes, appSynchronizerId),
    p2Sdk.ledger.dar.vet(tradingAppV2DarBytes, appSynchronizerId),
    p2Sdk.ledger.dar.vet(testTokenV1DarBytes, appSynchronizerId),
])
logger.info(
    'All DARs vetted on app-synchronizer for P1 (app-user) and P2 (app-provider)'
)

// ──────────────────────────────────────────────────────────
// 3. Allocate Parties (Alice, Bob, Trading App)
//
//    Key pairs are generated once per party and parties are
//    allocated on P1 (app-user) on the GLOBAL synchronizer.
//    The synchronizerId is passed explicitly: when a participant
//    is connected to multiple synchronizers the SDK defaults to
//    the first one returned by the API (which is app-synchronizer
//    here, not global), so we must be explicit.
//
//    TODO: Once the example evolves, also allocate on P2/P3
//          when parties are split across participants.
// ──────────────────────────────────────────────────────────

const PARTY_HINTS = ['v1-15-alice', 'v1-15-bob', 'v1-15-trading-app'] as const
type PartyHint = (typeof PARTY_HINTS)[number]

// Key pairs are participant-independent — generate once on P1.
const partyKeyPairs: Record<
    PartyHint,
    ReturnType<typeof p1Sdk.keys.generate>
> = Object.fromEntries(
    PARTY_HINTS.map((hint) => [hint, p1Sdk.keys.generate()])
) as Record<PartyHint, ReturnType<typeof p1Sdk.keys.generate>>

// Allocate on P1, explicitly targeting the global synchronizer.
const allocatedOnP1 = await Promise.all(
    PARTY_HINTS.map((hint) =>
        p1Sdk.party.external
            .create(partyKeyPairs[hint].publicKey, {
                partyHint: hint,
                synchronizerId: globalSynchronizerId,
            })
            .sign(partyKeyPairs[hint].privateKey)
            .execute()
    )
)

const partyInfo: Map<string, PartyInfo> = new Map(
    PARTY_HINTS.map((hint, i) => [
        hint,
        {
            partyId: allocatedOnP1[i].partyId,
            publicKeyFingerprint: allocatedOnP1[i].publicKeyFingerprint,
            multiHash: allocatedOnP1[i].multiHash,
            topologyTransactions: allocatedOnP1[i].topologyTransactions,
            keyPair: partyKeyPairs[hint],
        },
    ])
)

const alice = partyInfo.get('v1-15-alice')!
const bob = partyInfo.get('v1-15-bob')!
const tradingApp = partyInfo.get('v1-15-trading-app')!

logger.info(
    `Parties allocated on P1 (global sync) — alice: ${alice.partyId}, bob: ${bob.partyId}, tradingApp: ${tradingApp.partyId}`
)

// ──────────────────────────────────────────────────────────
// 3b. Register parties on the App Synchronizer
//
//     Parties are on the global synchronizer (step 3 above).
//     To create Token contracts on the app-synchronizer the
//     parties must also be registered there. Only P1 submits
//     the registration because all transactions in this example
//     go through P1. P2/P3 registration can be added later
//     once parties are split across participants.
// ──────────────────────────────────────────────────────────

await Promise.all(
    [alice, bob, tradingApp].map((info) =>
        registerPartyOnSynchronizer(
            p1SdkCtx.ledgerProvider,
            info,
            appSynchronizerId
        )
    )
)
logger.info('All parties registered on app-synchronizer via P1 (app-user)')

// ──────────────────────────────────────────────────────────
// 4. Discover Amulet Asset
// ──────────────────────────────────────────────────────────

const amuletAsset = await asset.find(
    'Amulet',
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)

logger.info(`Amulet asset discovered — admin: ${amuletAsset.admin}`)

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
    (async () => {
        const [amuletTapCmdAlice, amuletTapDisclosedAlice] = await amulet.tap(
            alice.partyId,
            '2000000'
        )

        await p1Sdk.ledger
            .prepare({
                partyId: alice.partyId,
                commands: amuletTapCmdAlice,
                disclosedContracts: amuletTapDisclosedAlice,
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
    (async () => {
        const createTokenRulesCmd = {
            CreateCommand: {
                templateId: `${TEST_TOKEN_TEMPLATE_PREFIX}:TokenRules`,
                createArguments: {
                    admin: bob.partyId,
                },
            },
        }

        await p1Sdk.ledger
            .prepare({
                partyId: bob.partyId,
                commands: createTokenRulesCmd,
                disclosedContracts: [],
                synchronizerId: appSynchronizerId,
            })
            .sign(bob.keyPair.privateKey)
            .execute({ partyId: bob.partyId })

        logger.info('TokenRules created by Bob (on app-synchronizer)')
    })(),

    // Step 6b: Mint Token holding for Bob on the App (private) Synchronizer
    //
    //     Bob is both the owner and the instrumentId.admin of
    //     the Token, so he is the sole signatory and a simple
    //     single-party prepare/sign/execute is sufficient.
    //     The Token holding lives on the app-synchronizer.
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

        await p1Sdk.ledger
            .prepare({
                partyId: bob.partyId,
                commands: createTokenCmd,
                disclosedContracts: [],
                synchronizerId: appSynchronizerId,
            })
            .sign(bob.keyPair.privateKey)
            .execute({ partyId: bob.partyId })

        logger.info(
            'Bob: Token holding minted (500 TestToken, on app-synchronizer)'
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
    p1Sdk,
    logger,
    synchronizers,
    'TokenRules',
    [`${TEST_TOKEN_TEMPLATE_PREFIX}:TokenRules`],
    [bob.partyId]
)
await logContracts(
    p1Sdk,
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
    'OTCTrade created by Trading App:\n' +
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

await p1Sdk.ledger
    .prepare({
        partyId: tradingApp.partyId,
        commands: requestAllocationsCmd,
        disclosedContracts: [],
        synchronizerId: globalSynchronizerId,
    })
    .sign(tradingApp.keyPair.privateKey)
    .execute({ partyId: tradingApp.partyId })

logger.info('Trading App: Allocation requests created')
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

const [legIdAlice, { legId: legIdBob, tokenRulesCid }] = await Promise.all([
    // Step 9: Alice allocates Amulet for her leg (leg-0)
    //
    //    Alice reads her pending allocation requests, finds the
    //    leg where she is the sender, and exercises
    //    AllocationFactory_Allocate via the SDK high-level API.
    //    The SDK automatically selects UTXOs and calls the
    //    Amulet registry to resolve the AllocationFactory.
    (async () => {
        const pendingRequestsAlice = await token.allocation.request.pending(
            alice.partyId
        )
        const requestViewAlice = pendingRequestsAlice[0].interfaceViewValue!

        const legId = Object.keys(requestViewAlice.transferLegs).find(
            (key) => requestViewAlice.transferLegs[key].sender === alice.partyId
        )!
        if (!legId) throw new Error('No transfer leg found for Alice')

        const [allocCmdAlice, allocDisclosedAlice] =
            await token.allocation.instruction.create({
                allocationSpecification: {
                    settlement: requestViewAlice.settlement,
                    transferLegId: legId,
                    transferLeg: requestViewAlice.transferLegs[legId],
                },
                asset: amuletAsset,
            })

        await p1Sdk.ledger
            .prepare({
                partyId: alice.partyId,
                commands: allocCmdAlice,
                disclosedContracts: allocDisclosedAlice,
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
    (async () => {
        const pendingRequestsBob = await token.allocation.request.pending(
            bob.partyId
        )
        const requestViewBob = pendingRequestsBob[0].interfaceViewValue!

        const legId = Object.keys(requestViewBob.transferLegs).find(
            (key) => requestViewBob.transferLegs[key].sender === bob.partyId
        )!
        if (!legId) throw new Error('No transfer leg found for Bob')

        // Read Bob's Token holding CID and TokenRules CID from ACS
        const tokenHoldings = await logContracts(
            p1Sdk,
            logger,
            synchronizers,
            'Bob Token',
            [`${TEST_TOKEN_TEMPLATE_PREFIX}:Token`],
            [bob.partyId]
        )
        const tokenHoldingCid = tokenHoldings[0]?.contractId
        if (!tokenHoldingCid) throw new Error('Token holding not found for Bob')

        const tokenRulesContracts = await logContracts(
            p1Sdk,
            logger,
            synchronizers,
            'TokenRules',
            [`${TEST_TOKEN_TEMPLATE_PREFIX}:TokenRules`],
            [bob.partyId]
        )
        const tokenRulesCid = tokenRulesContracts[0]?.contractId
        if (!tokenRulesCid) throw new Error('TokenRules contract not found')

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

        await p1Sdk.ledger
            .prepare({
                partyId: bob.partyId,
                commands: allocateBobCmd,
                disclosedContracts: [],
                synchronizerId: appSynchronizerId,
            })
            .sign(bob.keyPair.privateKey)
            .execute({ partyId: bob.partyId })

        logger.info(
            'Bob: TestToken allocation created for leg-1 (on app-synchronizer)'
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
    p1Sdk,
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
// ──────────────────────────────────────────────────────────

// Read allocations for each party
const allocationsAlice = await token.allocation.pending(alice.partyId)
const amuletAllocation = allocationsAlice.find(
    (a) => a.interfaceViewValue.allocation.transferLegId === legIdAlice
)
if (!amuletAllocation) throw new Error('Amulet allocation not found')

const allocationsBob = await token.allocation.pending(bob.partyId)
const testTokenAllocation = allocationsBob.find(
    (a) => a.interfaceViewValue.allocation.transferLegId === legIdBob
)
if (!testTokenAllocation) throw new Error('TestToken allocation not found')
const testTokenAllocationCid = testTokenAllocation.contractId

// Get choice context for Amulet allocation (from registry)
const amuletAllocContext = await token.allocation.context.execute({
    allocationCid: amuletAllocation.contractId,
    registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
})

// Read allocation request CIDs to archive during settlement
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

await multiPartySubmit(p1Sdk, p1SdkCtx.ledgerProvider, p1SdkCtx.userId, {
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
    p1Sdk,
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
    p1Sdk,
    logger,
    synchronizers,
    'Bob Token',
    [`${TEST_TOKEN_TEMPLATE_PREFIX}:Token`],
    [bob.partyId]
)
await logContracts(
    p1Sdk,
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

// Find Alice's Token holding (received from settlement)
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
    p1Sdk,
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
    p1Sdk,
    logger,
    synchronizers,
    'Bob Token',
    [`${TEST_TOKEN_TEMPLATE_PREFIX}:Token`],
    [bob.partyId]
)
await logContracts(
    p1Sdk,
    logger,
    synchronizers,
    'TokenRules',
    [`${TEST_TOKEN_TEMPLATE_PREFIX}:TokenRules`],
    [bob.partyId]
)
