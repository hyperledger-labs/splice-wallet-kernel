// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 } from 'uuid'
import { type Logger } from 'pino'
import { PartyId } from '@canton-network/core-types'
import {
    WalletSDK,
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    localNetStaticConfig,
    LedgerController,
} from '@canton-network/wallet-sdk'

// This example needs uploaded .dar for splice-token-test-trading-app
// It's in files of localnet, but it's not uploaded to participant, so we need to do this in the script
// Adjust if to your .localnet location
const PATH_TO_LOCALNET = '../../../.localnet'
const PATH_TO_DAR_IN_LOCALNET = '/dars/splice-token-test-trading-app-1.0.0.dar'
const TRADING_APP_PACKAGE_ID =
    'e5c9847d5a88d3b8d65436f01765fc5ba142cc58529692e2dacdd865d9939f71'

export class OTCTrade {
    private venue: PartyId
    private alice: PartyId
    private bob: PartyId
    private logger: Logger
    private sdk: WalletSDK

    constructor(args: {
        logger: Logger
        venue: PartyId
        alice: PartyId
        bob: PartyId
    }) {
        this.venue = args.venue
        this.alice = args.alice
        this.bob = args.bob
        this.logger = args.logger
        this.sdk = new WalletSDKImpl().configure({
            logger: this.logger,
            authFactory: localNetAuthDefault,
            ledgerFactory: localNetLedgerDefault,
            topologyFactory: localNetTopologyDefault,
            tokenStandardFactory: localNetTokenStandardDefault,
        })
    }

    async setup(): Promise<{ otcTradeCid: string }> {
        this.logger.info('SDK initialized')

        await this.sdk.connect()
        this.logger.info('Connected to ledger')

        await this.sdk.connectAdmin()
        await this.sdk.connectTopology(
            localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL
        )

        const here = path.dirname(fileURLToPath(import.meta.url))

        const tradingDarPath = path.join(
            here,
            PATH_TO_LOCALNET,
            PATH_TO_DAR_IN_LOCALNET
        )

        const isDarUploaded = await this.sdk.userLedger?.isPackageUploaded(
            TRADING_APP_PACKAGE_ID
        )
        this.logger.info({ isDarUploaded }, 'Status of TradingApp dar upload')

        if (!isDarUploaded) {
            try {
                const darBytes = await fs.readFile(tradingDarPath)
                await this.sdk.adminLedger?.uploadDar(darBytes)
                this.logger.info(
                    'Trading app DAR ensured on participant (uploaded or already present)'
                )
            } catch (e) {
                this.logger.error(
                    { e, tradingDarPath },
                    'Failed to ensure trading app DAR uploaded'
                )
                throw e
            }
        }

        this.sdk.tokenStandard?.setTransferFactoryRegistryUrl(
            localNetStaticConfig.LOCALNET_REGISTRY_API_URL
        )
        const instrumentAdminPartyId =
            (await this.sdk.tokenStandard?.getInstrumentAdmin()) || ''

        // Alice creates OTCTradeProposal
        await this.sdk.setPartyId(this.alice)

        // Define what holdings each party will trade
        const transferLegs = {
            leg0: {
                sender: this.alice,
                receiver: this.bob,
                amount: '100',
                instrumentId: { admin: instrumentAdminPartyId, id: 'Amulet' },
                meta: { values: {} },
            },
            leg1: {
                sender: this.bob,
                receiver: this.alice,
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
                    venue: this.venue,
                    tradeCid: null,
                    transferLegs,
                    approvers: [this.alice],
                },
            },
        }

        await this.sdk.userLedger!.submitCommand(createProposal, v4())

        this.logger.info('Alice created OTCTradeProposal')

        // Bob accepts the OTCTradeProposal
        await this.sdk.setPartyId(this.bob)
        const activeTradeProposals = await this.sdk.userLedger?.activeContracts(
            {
                offset: (await this.sdk.userLedger!.ledgerEnd()).offset,
                templateIds: [
                    '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
                ],
                parties: [this.bob],
                filterByParty: true,
            }
        )

        const otcpCid =
            activeTradeProposals?.[0]?.contractEntry &&
            LedgerController.getActiveContractCid(
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
                    choiceArgument: { approver: this.bob },
                },
            },
        ]
        await this.sdk.userLedger!.submitCommand(acceptCmd, v4())

        this.logger.info('Bob accepted OTCTradeProposal')

        // Venue initiates settlement of OTCTradeProposal
        await this.sdk.setPartyId(this.venue)
        const activeTradeProposals2 =
            await this.sdk.userLedger?.activeContracts({
                offset: (await this.sdk.userLedger!.ledgerEnd()).offset,
                templateIds: [
                    '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
                ],
                parties: [this.venue],
                filterByParty: true,
            })

        const now = new Date()
        const prepareUntil = new Date(
            now.getTime() + 60 * 60 * 1000
        ).toISOString()
        const settleBefore = new Date(
            now.getTime() + 2 * 60 * 60 * 1000
        ).toISOString()

        const otcpCid2 =
            activeTradeProposals2?.[0]?.contractEntry &&
            LedgerController.getActiveContractCid(
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

        await this.sdk.userLedger!.submitCommand(initiateSettlementCmd, v4())

        this.logger.info('Venue initated settlement of OTCTradeProposal')

        const otcTrades = await this.sdk.userLedger!.activeContracts({
            offset: (await this.sdk.userLedger!.ledgerEnd()).offset,
            templateIds: [
                '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTrade',
            ],
            parties: [this.venue],
            filterByParty: true,
        })

        const otcTradeCid = LedgerController.getActiveContractCid(
            otcTrades?.[0]?.contractEntry
        )
        if (!otcTradeCid) throw new Error('OTCTrade not found for venue')

        return { otcTradeCid }
    }

    async settle(args: { otcTradeCid: string }): Promise<void> {
        // Once the legs have been allocated, venue settles the trade triggering transfer of holdings
        await this.sdk.setPartyId(this.venue)

        // Poll until all allocations are visible
        const maxAttempts = 10
        const expectedLegs = 2
        const fetchRelevantAllocations = async () => {
            const all =
                await this.sdk.tokenStandard!.fetchPendingAllocationView()
            return all.filter(
                (a) =>
                    // TODO: check settlementRefId?
                    a.interfaceViewValue.allocation.settlement.executor ===
                    this.venue
            )
        }

        let relevantAllocations = await fetchRelevantAllocations()
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            if (relevantAllocations.length >= expectedLegs) break
            this.logger.info(
                `Waiting for allocations to be visible (attempt ${attempt}/${maxAttempts}, found ${relevantAllocations.length}/${expectedLegs})`
            )
            await new Promise((resolve) => setTimeout(resolve, 1000))
            relevantAllocations = await fetchRelevantAllocations()
        }
        if (relevantAllocations.length === 0)
            throw new Error('No matching allocations for this trade')

        const allocationEntries = await Promise.all(
            relevantAllocations.map(async (a) => {
                const cid = a.contractId
                const choiceContext =
                    await this.sdk.tokenStandard!.getAllocationExecuteTransferChoiceContext(
                        cid
                    )

                return {
                    cid,
                    legId: a.interfaceViewValue.allocation.transferLegId,
                    extraArgs: {
                        context: {
                            values:
                                choiceContext.choiceContextData?.values ?? {},
                        },
                        meta: { values: {} },
                    },
                    disclosedContracts: choiceContext.disclosedContracts ?? [],
                }
            })
        )

        const allocationsWithContext: Record<
            string,
            { _1: string; _2: unknown }
        > = Object.fromEntries(
            allocationEntries.map((e) => [
                e.legId,
                { _1: e.cid, _2: e.extraArgs },
            ])
        )

        const uniqueDisclosedContracts = Array.from(
            new Map(
                allocationEntries
                    .flatMap((e) => e.disclosedContracts)
                    .map((d) => [d.contractId, d])
            ).values()
        )

        const settleCmd = [
            {
                ExerciseCommand: {
                    templateId:
                        '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTrade',
                    contractId: args.otcTradeCid,
                    choice: 'OTCTrade_Settle',
                    choiceArgument: { allocationsWithContext },
                },
            },
        ]

        await this.sdk.userLedger!.submitCommand(
            settleCmd,
            v4(),
            uniqueDisclosedContracts
        )

        this.logger.info(
            'Venue settled the OTCTrade, holdings are transfered to Alice and Bob'
        )
    }
}
