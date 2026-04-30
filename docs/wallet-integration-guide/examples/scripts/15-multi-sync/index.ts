import pino from 'pino'
import { logContracts } from '../utils/index.js'
import { setupMultiSyncTrade } from './_setup.js'
import {
    AMULET_TEMPLATE_ID,
    TEST_TOKEN_PREFIX,
    TRADING_APP_PREFIX,
    mintAmuletForAlice,
    createTokenRulesAndMintForBob,
    createAndInitiateOtcTrade,
    allocateAmuletForAlice,
    allocateTokenForBob,
    reassignContractToGlobal,
    settleOtcTrade,
    transferTokenToAppSync,
} from './_trade_ops.js'

// Multi-Synchronizer DvP: Alice pays 100 Amulet on global; Bob delivers 20 TestToken from app-sync.
// P1 = app-user (Alice), P2 = app-provider (Bob), P3 = sv (TradingApp).
// See index.md for the full flow description.

const logger = pino({ name: 'v1-15-multi-sync-trade', level: 'info' })

// ── Setup: create SDKs, discover synchronizers, vet DARs, allocate parties ───
// Step 1: Create SDKs for all 3 participants (P1, P2, P3) and discover global + app synchronizers
// Step 2: Vet DARs on all synchronizers (global + app) and all participants (P1, P2, P3)
// Step 3: Allocate parties for Alice (P1), Bob (P2), and TradingApp (P3)
// Step 4: Discover Token interface on app synchronizer for Bob's token (used in Steps 6b and 10)
const setup = await setupMultiSyncTrade(logger)
const {
    p1Sdk,
    p2Sdk,
    p3Sdk,
    p2SdkCtx,
    tokenP2,
    alice,
    bob,
    tradingApp,
    globalSynchronizerId,
    appSynchronizerId,
    synchronizers,
    amuletAdmin,
} = setup

// ── Steps 5–6: Init holdings ────────────────────────────────────────────────
// Step 5:  Mint Amulet for Alice (global synchronizer)
// Steps 6a+6b: TokenRules + Token for Bob (app synchronizer)
await Promise.all([
    mintAmuletForAlice(setup, logger),
    createTokenRulesAndMintForBob(setup, logger),
])
logger.info('Contracts after setup:')
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
    'Bob TokenRules',
    [`${TEST_TOKEN_PREFIX}:TokenRules`],
    [bob.partyId]
)
await logContracts(
    p2Sdk,
    logger,
    synchronizers,
    'Bob Token',
    [`${TEST_TOKEN_PREFIX}:Token`],
    [bob.partyId]
)

// ── OTC trade terms ───────────────────────────────────────────────────────────
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

// ── Steps 7a–7c + 8: Propose → Accept → Initiate settlement → Read OTCTrade ─
const otcTradeCid = await createAndInitiateOtcTrade(setup, transferLegs, logger)
logger.info('Contracts after trade initiation:')
await logContracts(
    p3Sdk,
    logger,
    synchronizers,
    'OTCTrade',
    [`${TRADING_APP_PREFIX}:OTCTrade`],
    [tradingApp.partyId]
)

// ── Steps 9–10: Allocate in parallel ────────────────────────────────────────
// Step 9:  Alice allocates Amulet for leg-0 (global synchronizer)
// Step 10: Bob allocates Token for leg-1 (app synchronizer)
const [legIdAlice, { legId: legIdBob, tokenRulesCid, tokenRulesContract }] =
    await Promise.all([
        allocateAmuletForAlice(setup, logger),
        allocateTokenForBob(setup, logger),
    ])
logger.info('Contracts after allocations:')
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
    'Bob Token',
    [`${TEST_TOKEN_PREFIX}:Token`],
    [bob.partyId]
)

// ── Step 11a: Reassign Bob's TokenAllocation from app-sync to global ──────────
// TradingApp is only an observer of TokenAllocation (signatory = Bob).
// Explicit pre-reassignment by Bob (P2) avoids SUBMITTER_ALWAYS_STAKEHOLDER during settle.
const allocationsBob = await tokenP2.allocation.pending(bob.partyId)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const testTokenAllocation = allocationsBob.find(
    (a: any) => a.interfaceViewValue.allocation.transferLegId === legIdBob
)
if (!testTokenAllocation) throw new Error('TestToken allocation not found')
const testTokenAllocationCid = testTokenAllocation.contractId

await reassignContractToGlobal(
    p2SdkCtx.ledgerProvider,
    bob.partyId,
    testTokenAllocationCid,
    appSynchronizerId,
    globalSynchronizerId
)
logger.info('Bob: TokenAllocation reassigned from app-synchronizer to global')

// ── Step 11b: TradingApp settles the OTCTrade ─────────────────────────────────
await settleOtcTrade(
    setup,
    { otcTradeCid, legIdAlice, legIdBob, testTokenAllocationCid },
    logger
)
logger.info('Contracts after settlement:')
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
    [`${TEST_TOKEN_PREFIX}:Token`],
    [alice.partyId]
)
await logContracts(
    p2Sdk,
    logger,
    synchronizers,
    'Bob Token',
    [`${TEST_TOKEN_PREFIX}:Token`],
    [bob.partyId]
)

// ── Step 12: Alice self-transfers Token to app-synchronizer ───────────────────
const aliceTokenContracts = await p1Sdk.ledger.acs.read({
    templateIds: [`${TEST_TOKEN_PREFIX}:Token`],
    parties: [alice.partyId],
    filterByParty: true,
})
const aliceTokenCid = aliceTokenContracts[0]?.contractId
if (!aliceTokenCid)
    throw new Error('Token holding not found for Alice after settlement')

await transferTokenToAppSync(
    setup,
    { aliceTokenCid, tokenRulesCid, tokenRulesContract },
    logger
)
logger.info('Final contract state:')
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
    [`${TEST_TOKEN_PREFIX}:Token`],
    [alice.partyId]
)
await logContracts(
    p2Sdk,
    logger,
    synchronizers,
    'Bob Token',
    [`${TEST_TOKEN_PREFIX}:Token`],
    [bob.partyId]
)
await logContracts(
    p2Sdk,
    logger,
    synchronizers,
    'Bob TokenRules',
    [`${TEST_TOKEN_PREFIX}:TokenRules`],
    [bob.partyId]
)
