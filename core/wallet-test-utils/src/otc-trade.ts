// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { type Logger } from 'pino'
import { PartyId } from '@canton-network/core-types'
import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

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
    }

    async setup(): Promise<{ otcTradeCid: string }> {
        this.logger.info('SDK initialized')

        const sdk = await SDK.create({
            auth: {
                method: 'self_signed',
                issuer: 'unsafe-auth',
                credentials: {
                    clientId: 'ledger-api-user',
                    clientSecret: 'unsafe',
                    audience: 'https://canton.network.global',
                    scope: '',
                },
            },
            ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
        })
        const here = path.dirname(fileURLToPath(import.meta.url))

        const tradingDarPath = path.join(
            here,
            PATH_TO_LOCALNET,
            PATH_TO_DAR_IN_LOCALNET
        )

        //upload dar
        const darBytes = await fs.readFile(tradingDarPath)
        await sdk.ledger.dar.upload(darBytes, TRADING_APP_PACKAGE_ID)

        // const token = await sdk.token({
        //     validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
        //     registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
        //     auth: {
        //         method: 'self_signed',
        //         issuer: 'unsafe-auth',
        //         credentials: {
        //             clientId: 'ledger-api-user',
        //             clientSecret: 'unsafe',
        //             audience: 'https://canton.network.global',
        //             scope: '',
        //         },
        //     },
        // })
        // this.sdk.tokenStandard?.setTransferFactoryRegistryUrl(
        //     localNetStaticConfig.LOCALNET_REGISTRY_API_URL
        // )
        // const instrumentAdminPartyId =
        //     (await this.sdk.tokenStandard?.getInstrumentAdmin()) || ''

        // Alice creates OTCTradeProposal

        const asset = await sdk.asset({
            registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
            auth: {
                method: 'self_signed',
                issuer: 'unsafe-auth',
                credentials: {
                    clientId: 'ledger-api-user',
                    clientSecret: 'unsafe',
                    audience: 'https://canton.network.global',
                    scope: '',
                },
            },
        })
        const amuletAsset = await asset.find(
            'Amulet',
            localNetStaticConfig.LOCALNET_REGISTRY_API_URL
        )

        // Define what holdings each party will trade

        const transferLegs = {
            leg0: {
                sender: this.alice,
                receiver: this.bob,
                amount: '100',
                instrumentId: { admin: amuletAsset.admin, id: 'Amulet' },
                meta: { values: {} },
            },
            leg1: {
                sender: this.bob,
                receiver: this.alice,
                amount: '20',
                instrumentId: { admin: amuletAsset.admin, id: 'Amulet' },
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

        await sdk.ledger.internal.submit({
            commands: [createProposal],
            disclosedContracts: [],
            actAs: [this.alice],
        })

        this.logger.info('Alice created OTCTradeProposal')

        // Bob accepts the OTCTradeProposal

        const activeTradeProposals = await sdk.ledger.acs.read({
            templateIds: [
                '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
            ],
            parties: [this.bob],
            filterByParty: true,
        })

        const otcpCid =
            activeTradeProposals?.[0]?.contractEntry &&
            'JsActiveContract' in activeTradeProposals[0].contractEntry
                ? activeTradeProposals[0].contractEntry.JsActiveContract
                      .createdEvent.contractId
                : undefined

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

        await sdk.ledger.internal.submit({
            commands: acceptCmd,
            actAs: [this.bob],
        })

        this.logger.info('Bob accepted OTCTradeProposal')

        // Venue initiates settlement of OTCTradeProposal
        const activeTradeProposals2 = await sdk.ledger.acs.read({
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
            'JsActiveContract' in activeTradeProposals2[0].contractEntry
                ? activeTradeProposals2[0].contractEntry.JsActiveContract
                      .createdEvent.contractId
                : undefined

        const initiateSettlementCmd = [
            {
                ExerciseCommand: {
                    templateId:
                        '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
                    contractId: otcpCid2!,
                    choice: 'OTCTradeProposal_InitiateSettlement',
                    choiceArgument: { prepareUntil, settleBefore },
                },
            },
        ]

        await sdk.ledger.internal.submit({
            commands: initiateSettlementCmd,
            actAs: [this.venue],
        })

        this.logger.info('Venue initated settlement of OTCTradeProposal')

        const otcTrades = await sdk.ledger.acs.read({
            templateIds: [
                '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTrade',
            ],
            parties: [this.venue],
            filterByParty: true,
        })

        const otcTradeCid =
            otcTrades?.[0]?.contractEntry &&
            'JsActiveContract' in otcTrades[0].contractEntry
                ? otcTrades[0].contractEntry.JsActiveContract.createdEvent
                      .contractId
                : undefined
        if (!otcTradeCid) throw new Error('OTCTrade not found for venue')

        return { otcTradeCid }
    }
}
