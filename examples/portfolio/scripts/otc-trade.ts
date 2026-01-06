// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    localNetStaticConfig,
    LedgerController,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import * as readline from 'node:readline'

const logger = pino({ name: 'otc-trade', level: 'info' })

export function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })

    logger.info({ prompt: question })
    return new Promise((resolve) => {
        rl.question('', (answer) => {
            rl.close()
            resolve(answer)
        })
    })
}

// This example needs uploaded .dar for splice-token-test-trading-app
// It's in files of localnet, but it's not uploaded to participant, so we need to do this in the script
// Adjust if to your .localnet location
const PATH_TO_LOCALNET = '../../../.localnet'
const PATH_TO_DAR_IN_LOCALNET = '/dars/splice-token-test-trading-app-1.0.0.dar'
const TRADING_APP_PACKAGE_ID =
    'e5c9847d5a88d3b8d65436f01765fc5ba142cc58529692e2dacdd865d9939f71'

const sdk = new WalletSDKImpl().configure({
    logger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: localNetTopologyDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
})

logger.info('SDK initialized')

await sdk.connect()
logger.info('Connected to ledger')

await sdk.connectAdmin()
await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)

const here = path.dirname(fileURLToPath(import.meta.url))

const tradingDarPath = path.join(
    here,
    PATH_TO_LOCALNET,
    PATH_TO_DAR_IN_LOCALNET
)

const isDarUploaded = await sdk.userLedger?.isPackageUploaded(
    TRADING_APP_PACKAGE_ID
)
logger.info({ isDarUploaded }, 'Status of TradingApp dar upload')

if (!isDarUploaded) {
    try {
        const darBytes = await fs.readFile(tradingDarPath)
        await sdk.adminLedger?.uploadDar(darBytes)
        logger.info(
            'Trading app DAR ensured on participant (uploaded or already present)'
        )
    } catch (e) {
        logger.error(
            { e, tradingDarPath },
            'Failed to ensure trading app DAR uploaded'
        )
        throw e
    }
}

const venue = await prompt('Party ID for Venue')
await sdk.setPartyId(venue)
const alice = await prompt('Party ID for Alice')
await sdk.setPartyId(alice) // Sanity check
const bob = await prompt('Party ID for Bob')
await sdk.setPartyId(bob)

sdk.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)
const instrumentAdminPartyId =
    (await sdk.tokenStandard?.getInstrumentAdmin()) || ''

// Alice creates OTCTradeProposal
await sdk.setPartyId(alice)

// Define what holdings each party will trade
const transferLegs = {
    leg0: {
        sender: alice,
        receiver: bob,
        amount: '100',
        instrumentId: { admin: instrumentAdminPartyId, id: 'Amulet' },
        meta: { values: {} },
    },
    leg1: {
        sender: bob,
        receiver: alice,
        amount: '20',
        instrumentId: { admin: instrumentAdminPartyId, id: 'Amulet' },
        meta: { values: {} },
    },
}

const createProposal = {
    CreateCommand: {
        templateId:
            '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
        createArguments: {
            venue,
            tradeCid: null,
            transferLegs,
            approvers: [alice],
        },
    },
}

await sdk.userLedger!.submitCommand(createProposal, v4())

logger.info('Alice created OTCTradeProposal')

// Bob accepts the OTCTradeProposal
await sdk.setPartyId(bob)
const activeTradeProposals = await sdk.userLedger?.activeContracts({
    offset: (await sdk.userLedger!.ledgerEnd()).offset,
    templateIds: [
        '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
    ],
    parties: [bob],
    filterByParty: true,
})

const otcpCid = LedgerController.getActiveContractCid(
    activeTradeProposals?.[0]?.contractEntry
)

if (otcpCid === undefined) {
    throw new Error('Unexpected lack of OTCTradeProposal contract')
}
const acceptCmd = [
    {
        ExerciseCommand: {
            templateId:
                '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
            contractId: otcpCid,
            choice: 'OTCTradeProposal_Accept',
            choiceArgument: { approver: bob },
        },
    },
]
await sdk.userLedger!.submitCommand(acceptCmd, v4())

logger.info('Bob accepted OTCTradeProposal')

// Venue initiates settlement of OTCTradeProposal
await sdk.setPartyId(venue)
const activeTradeProposals2 = await sdk.userLedger?.activeContracts({
    offset: (await sdk.userLedger!.ledgerEnd()).offset,
    templateIds: [
        '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
    ],
    parties: [venue],
    filterByParty: true,
})

const now = new Date()
const prepareUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
const settleBefore = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()

const otcpCid2 = LedgerController.getActiveContractCid(
    activeTradeProposals2?.[0]?.contractEntry
)

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

await sdk.userLedger!.submitCommand(initiateSettlementCmd, v4())

logger.info('Venue initated settlement of OTCTradeProposal')

const otcTrades = await sdk.userLedger!.activeContracts({
    offset: (await sdk.userLedger!.ledgerEnd()).offset,
    templateIds: [
        '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTrade',
    ],
    parties: [venue],
    filterByParty: true,
})

const otcTradeCid = LedgerController.getActiveContractCid(
    otcTrades?.[0]?.contractEntry
)
if (!otcTradeCid) throw new Error('OTCTrade not found for venue')

await prompt('Please type yes once both parties have made their allocations')

// Once the legs have been allocated, venue settles the trade triggering transfer of holdings
await sdk.setPartyId(venue)

const allocationsVenue = await sdk.tokenStandard!.fetchPendingAllocationView()
const relevantAllocations = allocationsVenue.filter(
    (a) =>
        // TODO: check settlementRefId?
        a.interfaceViewValue.allocation.settlement.executor === venue
)
if (relevantAllocations.length === 0)
    throw new Error('No matching allocations for this trade')

const allocationEntries = await Promise.all(
    relevantAllocations.map(async (a) => {
        const cid = a.contractId
        const choiceContext =
            await sdk.tokenStandard!.getAllocationExecuteTransferChoiceContext(
                cid
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

const allocationsWithContext: Record<string, { _1: string; _2: unknown }> =
    Object.fromEntries(
        allocationEntries.map((e) => [e.legId, { _1: e.cid, _2: e.extraArgs }])
    )

const uniqueDisclosedContracts = Array.from(
    new Map(
        allocationEntries
            .flatMap((e) => e.disclosedContracts)
            .map((d: unknown) => [d.contractId, d])
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

await sdk.userLedger!.submitCommand(settleCmd, v4(), uniqueDisclosedContracts)

logger.info(
    'Venue settled the OTCTrade, holdings are transfered to Alice and Bob'
)
