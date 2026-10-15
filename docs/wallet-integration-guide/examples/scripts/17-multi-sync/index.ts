import { logAllContracts } from '../utils/index.js'
import { setupMultiSyncTrade } from './_setup.js'
import {
    TEST_TOKEN_REGISTRY_PORT,
    TRADE_AMULET_AMOUNT,
    TRADE_TOKEN_AMOUNT,
} from './_constants.js'
import { mintAmuletForAlice, allocateAmuletForAlice } from './_amulet_ops.js'
import { mintAndTransferTokenToBob } from './_token_setup.js'
import { allocateTokenForBob } from './_token_allocation.js'
import { aliceTransferToCharlie } from './_token_transfer.js'
import { createAndInitiateOtcTrade } from './_trade_propose.js'
import { settleOtcTrade } from './_trade_settle.js'
import {
    startRegistry,
    stopRegistry,
} from '@canton-network/example-test-token-v1-registry'
import { TestToken } from '@canton-network/core-splice-codegen'

// Multi-Synchronizer DvP: Alice pays 100 Amulet on global; Bob delivers 20 TestToken from app-sync.
// app-user participant hosts Alice + TradingApp, app-provider hosts Bob (+ TokenAdmin); both
// app-user and app-provider connect to the global + app synchronizers, sv is global-only.

import { configureLogging } from '../utils/configure-logging.js'
const logger = await configureLogging()

// ── Setup: create SDKs, discover synchronizers, vet DARs, allocate parties ───
// Step 1: Create one SDK per party (Alice, TradingApp and Charlie on the app-user participant; Bob, TokenAdmin on the app-provider participant; sv on its own) and discover global + app synchronizers
// Step 2: Vet DARs on both synchronizers for app-user + app-provider; global only for sv (not connected to app-synchronizer)
// Step 3: Allocate parties for Alice, Charlie (app-user), Bob (app-provider), TradingApp (app-user, both synchronizers), and TokenAdmin (app-provider)
const setup = await setupMultiSyncTrade(logger)
const {
    aliceSdk,
    bobSdk,
    tradingAppSdk,
    tokenAdminSdk,
    charlieSdk,
    alice,
    bob,
    tradingApp,
    tokenAdmin,
    charlie,
    synchronizers,
    amuletAdmin,
} = setup

// ── Start the TestToken registry (CIP-56 off-ledger APIs) ───────────────────
await startRegistry({
    operator: {
        party: tokenAdmin.partyId,
        keys: tokenAdmin.keyPair,
    },
    synchronizerId: synchronizers.appSynchronizerId,
    port: TEST_TOKEN_REGISTRY_PORT,
    sdk: tokenAdminSdk,
})

// ── Steps 4–5: Init holdings ────────────────────────────────────────────────
// Step 4:  Mint Amulet for Alice (global synchronizer)
// Steps 5a–5e: TokenAdmin self-mints TestToken, offers to Bob via
//             TransferFactory_Transfer; Bob accepts via
//             TransferInstruction_Accept — all single-party submissions
//             (the TokenRules were created by the registry on start-up)
await Promise.all([
    mintAmuletForAlice(setup, logger),
    mintAndTransferTokenToBob(setup, logger),
])

logger.info('Contracts after setup:')
await logAllContracts(logger, synchronizers, [
    { sdk: aliceSdk, parties: [alice.partyId] },
    { sdk: bobSdk, parties: [bob.partyId] },
    { sdk: tokenAdminSdk, parties: [tokenAdmin.partyId] },
    { sdk: tradingAppSdk, parties: [tradingApp.partyId] },
])

// ── OTC trade terms ───────────────────────────────────────────────────────────
const transferLegs = {
    'leg-0': {
        sender: alice.partyId,
        receiver: bob.partyId,
        amount: TRADE_AMULET_AMOUNT,
        instrumentId: { admin: amuletAdmin, id: 'Amulet' },
        meta: { values: {} },
    },
    'leg-1': {
        sender: bob.partyId,
        receiver: alice.partyId,
        amount: TRADE_TOKEN_AMOUNT,
        instrumentId: {
            admin: tokenAdmin.partyId,
            id: TestToken.DAR.TestTokenID,
        },
        meta: { values: {} },
    },
}

// ── Steps 6a–6c + 7: Propose → Accept → Initiate settlement → Read OTCTrade ─
const otcTradeCid = await createAndInitiateOtcTrade(setup, transferLegs, logger)
logger.info('Contracts after trade initiation:')
await logAllContracts(logger, synchronizers, [
    { sdk: aliceSdk, parties: [alice.partyId] },
    { sdk: bobSdk, parties: [bob.partyId] },
    { sdk: tokenAdminSdk, parties: [tokenAdmin.partyId] },
    { sdk: tradingAppSdk, parties: [tradingApp.partyId] },
])
// ── Steps 8–9: Allocate in parallel ────────────────────────────────────────
// Step 8:  Alice allocates Amulet for leg-0 (global synchronizer)
// Step 9: Bob allocates TestToken for leg-1 (app-synchronizer)
const [legIdAlice, { legId: legIdBob }] = await Promise.all([
    allocateAmuletForAlice(setup, logger),
    allocateTokenForBob(setup, logger),
])
logger.info('Contracts after allocations:')
await logAllContracts(logger, synchronizers, [
    { sdk: aliceSdk, parties: [alice.partyId] },
    { sdk: bobSdk, parties: [bob.partyId] },
    { sdk: tokenAdminSdk, parties: [tokenAdmin.partyId] },
    { sdk: tradingAppSdk, parties: [tradingApp.partyId] },
])
// ── Step 10a: Locate Bob's TestToken allocation ────────────────────────────────────

const allocationsBob = await bobSdk.token.allocation.pending(bob.partyId)
const testTokenAllocation = allocationsBob.find(
    (a) => a.interfaceViewValue.allocation.transferLegId === legIdBob
)
if (!testTokenAllocation) throw new Error('TestToken allocation not found')
// ── Step 10b: Reassign Bob's TestToken allocation app-synchronizer → global ──
// TODO #2097 remove after bugfix in canton
await bobSdk.ledger.internal.reassign({
    submitter: bob.partyId,
    contractId: testTokenAllocation.contractId,
    source: synchronizers.appSynchronizerId,
    target: synchronizers.globalSynchronizerId,
})
logger.info(
    'Bob: TestToken allocation reassigned app-synchronizer → global ahead of settlement'
)

// ── Step 10c: Scan for both allocations from the TradingApp's perspective ─────
// Poll the TradingApp's ACS until Alice's Amulet allocation (leg-0) and Bob's
// reassigned TestToken allocation (leg-1) have both propagated — this replaces
// disclosing the TestToken allocation to the TradingApp's settlement participant.
const allocationsByLeg = await tradingAppSdk.token.allocation.scan({
    partyId: tradingApp.partyId,
    transferLegIds: [legIdAlice, legIdBob],
})
const amuletAllocationCid = allocationsByLeg[legIdAlice].contractId
const testTokenAllocationCid = allocationsByLeg[legIdBob].contractId

// ── Step 10d: TradingApp settles the OTCTrade ─────────────────────────────────
try {
    await settleOtcTrade(
        setup,
        {
            otcTradeCid,
            legIdAlice,
            legIdBob,
            amuletAllocationCid,
            testTokenAllocationCid,
        },
        logger
    )
} catch (e) {
    logger.error(
        { err: e },
        'Settlement failed — allocations cancelled, funds returned to Alice and Bob'
    )
    logger.info('Contracts after settlement failure (allocations cancelled):')
    await logAllContracts(logger, synchronizers, [
        { sdk: aliceSdk, parties: [alice.partyId] },
        { sdk: bobSdk, parties: [bob.partyId] },
        { sdk: tokenAdminSdk, parties: [tokenAdmin.partyId] },
        { sdk: tradingAppSdk, parties: [tradingApp.partyId] },
    ])
    stopRegistry()
    process.exit(1)
}
logger.info('Contracts after settlement:')
await logAllContracts(logger, synchronizers, [
    { sdk: aliceSdk, parties: [alice.partyId] },
    { sdk: bobSdk, parties: [bob.partyId] },
    { sdk: tokenAdminSdk, parties: [tokenAdmin.partyId] },
    { sdk: tradingAppSdk, parties: [tradingApp.partyId] },
])
// ── Step 11: Alice transfers her received TestToken to Charlie on app-synchronizer ─
await aliceTransferToCharlie(setup, logger)

logger.info('Final contract state:')
await logAllContracts(logger, synchronizers, [
    { sdk: aliceSdk, parties: [alice.partyId] },
    { sdk: bobSdk, parties: [bob.partyId] },
    { sdk: tokenAdminSdk, parties: [tokenAdmin.partyId] },
    { sdk: tradingAppSdk, parties: [tradingApp.partyId] },
    { sdk: charlieSdk, parties: [charlie.partyId] },
])

stopRegistry()
process.exit(0)
