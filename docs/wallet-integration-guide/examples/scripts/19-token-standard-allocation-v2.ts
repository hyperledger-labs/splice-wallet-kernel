import pino from 'pino'
import { localNetStaticConfig, SDK } from '@canton-network/wallet-sdk'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import {
    AMULET_NAMESPACE_CONFIG_SIMPLE,
    ASSET_CONFIG,
    localNetGlobalSynchronizer,
    TOKEN_NAMESPACE_CONFIG_SIMPLE,
    TOKEN_PROVIDER_CONFIG_DEFAULT,
} from './utils/index.js'
import type { PartyInfo } from './04-token-standard-allocation.js'
import type { FinalizedAllocation } from '@canton-network/core-token-standard-v2'
import Decimal from 'decimal.js'

/*
Used the TokenStandardV2AllocationIntegrationTest: https://github.com/canton-network/splice/blob/main/apps/app/src/test/scala/org/lfdecentralizedtrust/splice/integration/tests/TokenStandardV2AllocationIntegrationTest.scala
and the TokenStandardV2TestUtil https://github.com/canton-network/splice/blob/main/apps/app/src/test/scala/org/lfdecentralizedtrust/splice/integration/tests/TokenStandardV2TestUtil.scala
as a template for this
*/

async function poll<T>(
    description: string,
    fn: () => Promise<readonly T[] | undefined>,
    maxAttempts = 30,
    retryIntervalMs = 1000
): Promise<T[]> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const result: T[] = [...((await fn()) ?? [])]
        if (result.length > 0) return result
        logger.info({ attempt, maxAttempts }, `Waiting for ${description}`)
        await new Promise((resolve) => setTimeout(resolve, retryIntervalMs))
    }
    throw new Error(`Timed out waiting for ${description}`)
}

const logger = pino({ name: 'v2-token-standard-allocation', level: 'info' })

const sdk = await SDK.create({
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    // LocalNet may run both the global and an app synchronizer; the SDK refuses
    // to guess, so target the global one explicitly.
    synchronizerId: localNetGlobalSynchronizer,
    token: TOKEN_NAMESPACE_CONFIG_SIMPLE,
    amulet: AMULET_NAMESPACE_CONFIG_SIMPLE,
    asset: ASSET_CONFIG,
})

// This example needs uploaded .dar for splice-token-test-trading-app
// It's in files of localnet, but it's not uploaded to participant, so we need to do this in the script
// Adjust if to your .localnet location
const PATH_TO_LOCALNET = '../../../../.localnet'
const PATH_TO_TRADING_APP_V2_DAR_IN_LOCALNET =
    '/dars/splice-token-test-trading-app-v2-1.0.0.dar'
const TRADING_APP_V2_PACKAGE_ID =
    '20d42271cbd760c26c08401e4d1eec624458f5b48c73ae44c87c754e35621f5d'

const here = path.dirname(fileURLToPath(import.meta.url))

const tradingDarPath = path.join(
    here,
    PATH_TO_LOCALNET,
    PATH_TO_TRADING_APP_V2_DAR_IN_LOCALNET
)

//upload dar
const darBytes = await fs.readFile(tradingDarPath)
await sdk.ledger.dar.upload(darBytes, TRADING_APP_V2_PACKAGE_ID)

logger.info('trading dar uploaded')

const aliceSendAmount = 100
const bobSendAmount = 20

const allocatedParties = await Promise.all(
    ['v2-04-alice', 'v2-04-bob', 'v2-04-venue'].map(async (partyHint) => {
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

const alice = partyInfo.get('v2-04-alice')!
const bob = partyInfo.get('v2-04-bob')!
const venue = partyInfo.get('v2-04-venue')!

logger.info(`fund alice`)

const [amuletTapCommand, amuletTapDisclosedContracts] = await sdk.amulet.tap(
    alice.partyId,
    '2000000'
)

await sdk.ledger
    .prepare({
        partyId: alice.partyId,
        commands: amuletTapCommand,
        disclosedContracts: amuletTapDisclosedContracts,
    })
    .sign(alice.keyPair.privateKey)
    .execute({ partyId: alice.partyId })

const aliceUtxosAfterTap = await sdk.token.v2.utxos.list({
    partyId: alice.partyId,
})
const aliceBalance = aliceUtxosAfterTap.reduce(
    (sum, u) => sum + Number(u.interfaceViewValue.amount),
    0
)
if (aliceBalance < 2_000_000) {
    throw new Error(
        `Expected alice to have at least 2000000 Amulet after tap, got ${aliceBalance}`
    )
}
logger.info(`fund bob`)

const [amuletTapCommand2, amuletTapDisclosedContracts2] = await sdk.amulet.tap(
    bob.partyId,
    '2000000'
)

await sdk.ledger
    .prepare({
        partyId: bob.partyId,
        commands: amuletTapCommand2,
        disclosedContracts: amuletTapDisclosedContracts2,
    })
    .sign(bob.keyPair.privateKey)
    .execute({ partyId: bob.partyId })

const bobUtxosAfterTap = await sdk.token.v2.utxos.list({
    partyId: bob.partyId,
})
const bobBalance = bobUtxosAfterTap.reduce(
    (sum, u) => sum + Number(u.interfaceViewValue.amount),
    0
)
if (bobBalance < 2_000_000) {
    throw new Error(
        `Expected alice to have at least 2000000 Amulet after tap, got ${bobBalance}`
    )
}

logger.info(`minted amulet for alice and bob`)

const amuletAsset = await sdk.asset.find(
    'Amulet',
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)

const basicAccount = (partyId: string) => ({
    owner: partyId,
    provider: null,
    id: '',
})

const tradeLeg = (
    transferLegId: string,
    from: PartyInfo,
    to: PartyInfo,
    amount: number
) => ({
    admin: amuletAsset.admin,
    leg: {
        transferLegId,
        sender: basicAccount(from.partyId),
        receiver: basicAccount(to.partyId),
        amount: String(amount),
        instrumentId: 'Amulet',
        meta: { values: {} },
    },
})

const tradeLegs = [
    tradeLeg('leg0', alice, bob, aliceSendAmount),
    tradeLeg('leg1', bob, alice, bobSendAmount),
]

//venue writes executed trade to ledger

const OTC_TRADE_TEMPLATE_ID =
    '#splice-token-test-trading-app-v2:Splice.Testing.Apps.TradingAppV2:OTCTrade'
const now = Date.now()
const createProposal = {
    CreateCommand: {
        templateId: OTC_TRADE_TEMPLATE_ID,
        createArguments: {
            venue: venue.partyId,
            tradeLegs,
            createdAt: new Date(now).toISOString(),
            settleAt: new Date(now + 30_000).toISOString(),
            settlementDeadline: new Date(now + 10 * 60_000).toISOString(),
        },
    },
}

await sdk.ledger
    .prepare({
        partyId: venue.partyId,
        commands: createProposal,
        disclosedContracts: [],
    })
    .sign(venue.keyPair.privateKey)
    .execute({ partyId: venue.partyId })

const activeTradeProposals = await sdk.ledger.acsReader.readJsContracts({
    templateIds: [OTC_TRADE_TEMPLATE_ID],
    parties: [venue.partyId],
    filterByParty: true,
})

const otcpCid = activeTradeProposals[0].contractId

if (otcpCid === undefined) {
    throw new Error('Unexpected lack of OTCTradeProposal contract')
}

logger.info('Created active trade proposal')

const requestAllocationsCmd = [
    {
        ExerciseCommand: {
            templateId: OTC_TRADE_TEMPLATE_ID,
            contractId: otcpCid,
            choice: 'OTCTrade_RequestAllocations',
            choiceArgument: {},
        },
    },
]

await sdk.ledger
    .prepare({
        partyId: venue.partyId,
        commands: requestAllocationsCmd,
        disclosedContracts: [],
    })
    .sign(venue.keyPair.privateKey)
    .execute({ partyId: venue.partyId })

logger.info(`Venue requested allocations from alice and bob`)

async function acceptAsTrader(trader: PartyInfo, name: string) {
    const [request] = await poll(`V2 allocation request for ${name}`, () =>
        sdk.token.v2.allocation.request.pending(trader.partyId)
    )

    const [commands, dc] = await sdk.token.v2.allocation.request.accept({
        request,
        partyId: trader.partyId,
    })

    commands.map(async (c) => {
        await sdk.ledger
            .prepare({
                partyId: trader.partyId,
                commands: c,
                disclosedContracts: dc,
            })
            .sign(trader.keyPair.privateKey)
            .execute({ partyId: trader.partyId })
    })

    logger.info(
        { allocations: commands.length - 1 },
        `${name} allocated and accepted request`
    )

    return request.interfaceViewValue.settlement
}

const settlement = await acceptAsTrader(alice, 'Alice')
await acceptAsTrader(bob, 'Bob')

//venue batch settles the trade

const allocations = await sdk.token.v2.allocation.scan({
    partyId: venue.partyId,
    settlement,
    transferLegIds: tradeLegs.map((t) => t.leg.transferLegId),
})

const allLegSides = allocations.flatMap(
    (a) => a.interfaceViewValue.allocation.transferLegSides
)

for (const leg of tradeLegs) {
    const legSide = allLegSides.find(
        (ls) => ls.transferLegId === leg.leg.transferLegId
    )
    if (!legSide) {
        throw new Error(`No allocation found for leg ${leg.leg.transferLegId}`)
    }

    const actualAmount = new Decimal(legSide.amount)
    const legAmount = new Decimal(leg.leg.amount)
    if (!actualAmount.equals(legAmount)) {
        throw new Error(
            `Allocation for ${leg.leg.transferLegId} has amount ${actualAmount}, expected ${legAmount}`
        )
    }
}

const emptyExtraArgs = { context: { values: {} }, meta: { values: {} } }

const finalizedAllocation: FinalizedAllocation[] = allocations.map(
    (a) =>
        ({
            allocationCid: a.contractId,
            extraTransferLegSides: [],
            nextIterationFunding: null,
        }) as unknown as FinalizedAllocation
)

const { factoryId, choiceContext } =
    await sdk.token.v2.allocation.settlement.factory({
        registryUrl: amuletAsset.registryUrl,
        args: {
            settlement,
            transferLegs: tradeLegs.map((t) => t.leg),
            allocations: finalizedAllocation,
            actors: [venue.partyId],
            extraArgs: emptyExtraArgs,
        },
    })

const settleCmd = [
    {
        ExerciseCommand: {
            templateId: OTC_TRADE_TEMPLATE_ID,
            contractId: otcpCid,
            choice: 'OTCTrade_Settle',
            choiceArgument: {
                batchesByAdmin: [
                    [
                        amuletAsset.admin,
                        {
                            tag: 'SettlementBatchV2',
                            value: {
                                allocationCids: allocations.map(
                                    (a) => a.contractId
                                ),
                                missingAllocations: [],
                                factoryCid: factoryId,
                                extraArgs: {
                                    context: {
                                        ...choiceContext.choiceContextData,
                                        values:
                                            choiceContext.choiceContextData
                                                ?.values ?? {},
                                    },
                                    meta: { values: {} },
                                },
                            },
                        },
                    ],
                ],
                allocationRequests: [], //AllocationRequest_Accept should ahve already consumed the requests
            },
        },
    },
]

await sdk.ledger
    .prepare({
        partyId: venue.partyId,
        commands: settleCmd,
        disclosedContracts: choiceContext.disclosedContracts,
    })
    .sign(venue.keyPair.privateKey)
    .execute({ partyId: venue.partyId })

logger.info(`venue settled OTCTrade`)

const utxosAliceV2 = await sdk.token.v2.utxos.list({
    partyId: alice.partyId,
    includeLocked: true,
})

logger.info(utxosAliceV2)

const utxosBobV2 = await sdk.token.v2.utxos.list({
    partyId: bob.partyId,
    includeLocked: true,
})

logger.info(utxosBobV2)

function sumUnlocked(
    utxos: Awaited<ReturnType<typeof sdk.token.v2.utxos.list>>
) {
    return utxos
        .filter((u) => u.interfaceViewValue.lock === null)
        .reduce((sum, u) => sum + Number(u.interfaceViewValue.amount), 0)
}

const aliceBalanceBeforeTrade = aliceBalance
const bobBalanceBeforeTrade = bobBalance

const aliceBalanceAfter = sumUnlocked(utxosAliceV2)
const bobBalanceAfter = sumUnlocked(utxosBobV2)

const aliceNet = aliceBalanceAfter - aliceBalanceBeforeTrade
const bobNet = bobBalanceAfter - bobBalanceBeforeTrade

if (aliceNet !== bobSendAmount - aliceSendAmount) {
    throw new Error(
        `Alice's net balance change was ${aliceNet}, expected ${
            bobSendAmount - aliceSendAmount
        }`
    )
}
if (bobNet !== aliceSendAmount - bobSendAmount) {
    throw new Error(
        `Bob's net balance change was ${bobNet}, expected ${
            aliceSendAmount - bobSendAmount
        }`
    )
}

logger.info(
    { aliceNet, bobNet },
    'Verified settlement produced expected balance changes'
)
