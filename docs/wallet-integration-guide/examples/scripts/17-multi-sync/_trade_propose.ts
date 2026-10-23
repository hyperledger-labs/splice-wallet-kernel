// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Logger } from 'pino'
import type { SDKInterface } from '@canton-network/wallet-sdk'
import type { MultiSyncSetup } from './_setup.js'
import { TRADE_AMULET_AMOUNT, TRADE_TOKEN_AMOUNT } from './_constants.js'
import { OTCTrade } from '@canton-network/core-splice-codegen'
import type { TransferLeg } from '@canton-network/core-token-standard'
import { pollUntilFound } from './_poll.js'

const MS_30_MIN = 30 * 60 * 1000
const MS_1_HOUR = 60 * 60 * 1000

export async function createAndInitiateOtcTrade(
    setup: MultiSyncSetup,
    transferLegs: Record<string, TransferLeg>,
    logger: Logger
): Promise<string> {
    const {
        aliceSdk,
        bobSdk,
        tradingAppSdk,
        alice,
        bob,
        tradingApp,
        globalSynchronizerId,
    } = setup

    // The proposal is created and accepted on other participants than the ones
    // it is read from (Bob, TradingApp), so poll until it is visible there
    const readProposalCid = (
        sdk: SDKInterface<'token'>,
        party: string,
        predicate: (approvers: string[]) => boolean = () => true
    ): Promise<string> =>
        pollUntilFound(async () => {
            const proposals = await sdk.ledger.acsReader.raw.readJsContracts({
                templateIds: [
                    OTCTrade.DAR.TradingApp.OTCTradeProposal.templateId,
                ],
                parties: [party],
                filterByParty: true,
            })
            return proposals.find((proposal) =>
                predicate(
                    ((
                        proposal as unknown as {
                            createArgument?: { approvers?: string[] }
                        }
                    ).createArgument?.approvers ?? []) as string[]
                )
            )?.contractId
        }, 'Failed to find proposal cid')

    await aliceSdk.ledger
        .prepare({
            partyId: alice.partyId,
            commands: OTCTrade.commands.create.otcTradeProposal({
                venue: tradingApp.partyId,
                transferLegs,
                approvers: [alice.partyId],
                tradeCid: null,
            }),
            disclosedContracts: [],
            synchronizerId: globalSynchronizerId,
        })
        .sign(alice.keyPair.privateKey)
        .execute({ partyId: alice.partyId })
    logger.info(
        `Alice: OTCTradeProposal created (leg-0: ${TRADE_AMULET_AMOUNT} Amulet → Bob, leg-1: ${TRADE_TOKEN_AMOUNT} TestToken → Alice)`
    )

    await bobSdk.ledger
        .prepare({
            partyId: bob.partyId,
            commands: [
                OTCTrade.commands.exercise.otcTradeProposal.accept({
                    contractId: await readProposalCid(bobSdk, bob.partyId),
                    choiceArgument: {
                        approver: bob.partyId,
                    },
                }),
            ],
            disclosedContracts: [],
            synchronizerId: globalSynchronizerId,
        })
        .sign(bob.keyPair.privateKey)
        .execute({ partyId: bob.partyId })
    logger.info('Bob: OTCTradeProposal_Accept executed')

    const prepareUntil = new Date(Date.now() + MS_30_MIN).toISOString()
    const settleBefore = new Date(Date.now() + MS_1_HOUR).toISOString()

    await tradingAppSdk.ledger
        .prepare({
            partyId: tradingApp.partyId,
            commands: [
                OTCTrade.commands.exercise.otcTradeProposal.initiateSettlement({
                    contractId: await readProposalCid(
                        tradingAppSdk,
                        tradingApp.partyId,
                        (approvers) => approvers.includes(bob.partyId)
                    ),
                    choiceArgument: {
                        prepareUntil,
                        settleBefore,
                    },
                }),
            ],
            disclosedContracts: [],
            synchronizerId: globalSynchronizerId,
        })
        .sign(tradingApp.keyPair.privateKey)
        .execute({ partyId: tradingApp.partyId })
    logger.info(
        'TradingApp: OTCTradeProposal_InitiateSettlement executed → OTCTrade created'
    )

    const otcTradeContracts =
        await tradingAppSdk.ledger.acsReader.raw.readJsContracts({
            templateIds: [OTCTrade.DAR.TradingApp.OTCTrade.templateId],
            parties: [tradingApp.partyId],
            filterByParty: true,
        })
    const otcTradeCid = otcTradeContracts[0]?.contractId
    if (!otcTradeCid)
        throw new Error('OTCTrade contract not found after initiation')
    return otcTradeCid
}
