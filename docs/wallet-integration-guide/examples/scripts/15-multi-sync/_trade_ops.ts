// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Logger } from 'pino'
import type { SDKContext } from '@canton-network/wallet-sdk'
import type { MultiSyncSetup } from './_setup.js'

// ── Raw ledger API response shapes ───────────────────────────────────────────

interface ReassignmentEvent {
    JsUnassignedEvent?: { value: { reassignmentId: string } }
}
interface ReassignmentResponse {
    reassignment: { events: ReassignmentEvent[] }
}

// ── ACS contract entry (as returned by ledger.acs.read) ───────────────────────

interface AcsContractEntry {
    contractId: string
    templateId: string
    createdEventBlob?: string
    synchronizerId: string
}

// ── Template / interface identifiers ─────────────────────────────────────────

export const AMULET_TEMPLATE_ID = '#splice-amulet:Splice.Amulet:Amulet'
export const TEST_TOKEN_PREFIX =
    '#splice-test-token-v1:Splice.Testing.Tokens.TestTokenV1'
export const TRADING_APP_PREFIX =
    '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp'

const ALLOCATION_FACTORY_IFACE =
    '#splice-api-token-allocation-instruction-v1:Splice.Api.Token.AllocationInstructionV1:AllocationFactory'
const TRANSFER_FACTORY_IFACE =
    '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferFactory'

export async function mintAmuletForAlice(
    setup: MultiSyncSetup,
    logger: Logger
): Promise<void> {
    const { p1Sdk, alice, globalSynchronizerId, scanProxy } = setup
    const {
        amuletRulesContract,
        amuletRulesCid,
        activeRoundContract,
        openMiningRoundCid,
    } = await scanProxy.fetchAmuletInfo()

    await p1Sdk.ledger
        .prepare({
            partyId: alice.partyId,
            commands: [
                {
                    ExerciseCommand: {
                        templateId:
                            '#splice-amulet:Splice.AmuletRules:AmuletRules',
                        contractId: amuletRulesCid,
                        choice: 'AmuletRules_DevNet_Tap',
                        choiceArgument: {
                            receiver: alice.partyId,
                            amount: '2000000',
                            openRound: openMiningRoundCid,
                        },
                    },
                },
            ],
            disclosedContracts: [
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
            ],
            synchronizerId: globalSynchronizerId,
        })
        .sign(alice.keyPair.privateKey)
        .execute({ partyId: alice.partyId })

    logger.info('Alice: Amulet minted (2,000,000) on global synchronizer')
}

export async function createTokenRulesAndMintForBob(
    setup: MultiSyncSetup,
    logger: Logger
): Promise<void> {
    const { p2Sdk, bob, appSynchronizerId } = setup

    await Promise.all([
        p2Sdk.ledger
            .prepare({
                partyId: bob.partyId,
                commands: {
                    CreateCommand: {
                        templateId: `${TEST_TOKEN_PREFIX}:TokenRules`,
                        createArguments: { admin: bob.partyId },
                    },
                },
                disclosedContracts: [],
                synchronizerId: appSynchronizerId,
            })
            .sign(bob.keyPair.privateKey)
            .execute({ partyId: bob.partyId }),

        p2Sdk.ledger
            .prepare({
                partyId: bob.partyId,
                commands: {
                    CreateCommand: {
                        templateId: `${TEST_TOKEN_PREFIX}:Token`,
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
                },
                disclosedContracts: [],
                synchronizerId: appSynchronizerId,
            })
            .sign(bob.keyPair.privateKey)
            .execute({ partyId: bob.partyId }),
    ])

    logger.info(
        'Bob: TokenRules created + Token minted (500 TestToken) on app-synchronizer'
    )
}

export async function createAndInitiateOtcTrade(
    setup: MultiSyncSetup,
    transferLegs: Record<string, unknown>,
    logger: Logger
): Promise<string> {
    const {
        p1Sdk,
        p2Sdk,
        p3Sdk,
        alice,
        bob,
        tradingApp,
        globalSynchronizerId,
    } = setup

    const readProposalCid = async (
        sdk: typeof p1Sdk,
        party: string
    ): Promise<string> => {
        const contracts = await sdk.ledger.acs.read({
            templateIds: [`${TRADING_APP_PREFIX}:OTCTradeProposal`],
            parties: [party],
            filterByParty: true,
        })
        if (!contracts.length) throw new Error('OTCTradeProposal not found')
        return contracts[0].contractId
    }

    await p1Sdk.ledger
        .prepare({
            partyId: alice.partyId,
            commands: {
                CreateCommand: {
                    templateId: `${TRADING_APP_PREFIX}:OTCTradeProposal`,
                    createArguments: {
                        venue: tradingApp.partyId,
                        tradeCid: null,
                        transferLegs,
                        approvers: [alice.partyId],
                    },
                },
            },
            disclosedContracts: [],
            synchronizerId: globalSynchronizerId,
        })
        .sign(alice.keyPair.privateKey)
        .execute({ partyId: alice.partyId })
    logger.info(
        'Alice: OTCTradeProposal created (leg-0: 100 Amulet → Bob, leg-1: 20 TestToken → Alice)'
    )

    await p2Sdk.ledger
        .prepare({
            partyId: bob.partyId,
            commands: [
                {
                    ExerciseCommand: {
                        templateId: `${TRADING_APP_PREFIX}:OTCTradeProposal`,
                        contractId: await readProposalCid(p2Sdk, bob.partyId),
                        choice: 'OTCTradeProposal_Accept',
                        choiceArgument: { approver: bob.partyId },
                    },
                },
            ],
            disclosedContracts: [],
            synchronizerId: globalSynchronizerId,
        })
        .sign(bob.keyPair.privateKey)
        .execute({ partyId: bob.partyId })
    logger.info('Bob: OTCTradeProposal_Accept executed')

    const prepareUntil = new Date(Date.now() + 1800 * 1000).toISOString()
    const settleBefore = new Date(Date.now() + 3600 * 1000).toISOString()

    await p3Sdk.ledger
        .prepare({
            partyId: tradingApp.partyId,
            commands: [
                {
                    ExerciseCommand: {
                        templateId: `${TRADING_APP_PREFIX}:OTCTradeProposal`,
                        contractId: await readProposalCid(
                            p3Sdk,
                            tradingApp.partyId
                        ),
                        choice: 'OTCTradeProposal_InitiateSettlement',
                        choiceArgument: { prepareUntil, settleBefore },
                    },
                },
            ],
            disclosedContracts: [],
            synchronizerId: globalSynchronizerId,
        })
        .sign(tradingApp.keyPair.privateKey)
        .execute({ partyId: tradingApp.partyId })
    logger.info(
        'TradingApp: OTCTradeProposal_InitiateSettlement executed → OTCTrade created'
    )

    const otcTradeContracts = await p3Sdk.ledger.acs.read({
        templateIds: [`${TRADING_APP_PREFIX}:OTCTrade`],
        parties: [tradingApp.partyId],
        filterByParty: true,
    })
    const otcTradeCid = otcTradeContracts[0]?.contractId
    if (!otcTradeCid)
        throw new Error('OTCTrade contract not found after initiation')
    return otcTradeCid
}

export async function allocateAmuletForAlice(
    setup: MultiSyncSetup,
    logger: Logger
): Promise<string> {
    const {
        p1Sdk,
        tokenP1,
        alice,
        globalSynchronizerId,
        scanProxy,
        amuletAdmin,
    } = setup

    const pendingRequests = await tokenP1.allocation.request.pending(
        alice.partyId
    )
    const requestView = pendingRequests[0].interfaceViewValue!
    const legId = Object.keys(requestView.transferLegs).find(
        (key) => requestView.transferLegs[key].sender === alice.partyId
    )!
    if (!legId) throw new Error('No transfer leg found for Alice')

    const amuletHoldings = await p1Sdk.ledger.acs.read({
        templateIds: [AMULET_TEMPLATE_ID],
        parties: [alice.partyId],
        filterByParty: true,
    })
    const amuletHoldingCid = amuletHoldings[0]?.contractId
    if (!amuletHoldingCid) throw new Error('Amulet holding not found for Alice')

    const allocationArgs = {
        expectedAdmin: amuletAdmin,
        allocation: {
            settlement: requestView.settlement,
            transferLegId: legId,
            transferLeg: requestView.transferLegs[legId],
        },
        requestedAt: new Date().toISOString(),
        inputHoldingCids: [amuletHoldingCid],
        extraArgs: {
            context: { values: {} as Record<string, unknown> },
            meta: { values: {} },
        },
    }

    const { factoryId, choiceContext } =
        await scanProxy.fetchAllocationFactory(allocationArgs)
    allocationArgs.extraArgs.context = {
        ...(choiceContext.choiceContextData ?? {}),
        values:
            (choiceContext.choiceContextData?.values as Record<
                string,
                unknown
            >) ?? {},
    }

    await p1Sdk.ledger
        .prepare({
            partyId: alice.partyId,
            commands: [
                {
                    ExerciseCommand: {
                        templateId: ALLOCATION_FACTORY_IFACE,
                        contractId: factoryId,
                        choice: 'AllocationFactory_Allocate',
                        choiceArgument: allocationArgs,
                    },
                },
            ],
            disclosedContracts: choiceContext.disclosedContracts ?? [],
            synchronizerId: globalSynchronizerId,
        })
        .sign(alice.keyPair.privateKey)
        .execute({ partyId: alice.partyId })

    logger.info('Alice: Amulet allocated for leg-0 (global synchronizer)')
    return legId
}

export async function allocateTokenForBob(
    setup: MultiSyncSetup,
    logger: Logger
): Promise<{
    legId: string
    tokenRulesCid: string
    tokenRulesContract: AcsContractEntry
}> {
    const { p2Sdk, tokenP2, bob, appSynchronizerId } = setup

    const pendingRequests = await tokenP2.allocation.request.pending(
        bob.partyId
    )
    const requestView = pendingRequests[0].interfaceViewValue!
    const legId = Object.keys(requestView.transferLegs).find(
        (key) => requestView.transferLegs[key].sender === bob.partyId
    )!
    if (!legId) throw new Error('No transfer leg found for Bob')

    const [tokenHoldings, tokenRulesContracts] = await Promise.all([
        p2Sdk.ledger.acs.read({
            templateIds: [`${TEST_TOKEN_PREFIX}:Token`],
            parties: [bob.partyId],
            filterByParty: true,
        }),
        p2Sdk.ledger.acs.read({
            templateIds: [`${TEST_TOKEN_PREFIX}:TokenRules`],
            parties: [bob.partyId],
            filterByParty: true,
        }),
    ])

    const tokenHoldingCid = tokenHoldings[0]?.contractId
    if (!tokenHoldingCid) throw new Error('Token holding not found for Bob')
    const tokenRulesCid = tokenRulesContracts[0]?.contractId
    if (!tokenRulesCid) throw new Error('TokenRules contract not found')
    const tokenRulesContract = tokenRulesContracts[0]

    await p2Sdk.ledger
        .prepare({
            partyId: bob.partyId,
            commands: [
                {
                    ExerciseCommand: {
                        templateId: ALLOCATION_FACTORY_IFACE,
                        contractId: tokenRulesCid,
                        choice: 'AllocationFactory_Allocate',
                        choiceArgument: {
                            expectedAdmin: bob.partyId,
                            allocation: {
                                settlement: requestView.settlement,
                                transferLegId: legId,
                                transferLeg: requestView.transferLegs[legId],
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
            ],
            disclosedContracts: [],
            synchronizerId: appSynchronizerId,
        })
        .sign(bob.keyPair.privateKey)
        .execute({ partyId: bob.partyId })

    logger.info('Bob: TestToken allocated for leg-1 (app-synchronizer)')
    return { legId, tokenRulesCid, tokenRulesContract }
}

/**
 * Explicitly reassigns a contract between synchronizers using two raw API calls:
 *   1. UnassignCommand — removes the contract from `source`, returns a reassignmentId
 *   2. AssignCommand   — places the contract on `target` using the reassignmentId
 *
 * Note: `reassignmentId` ≠ `updateId` — it is the per-contract counter returned in
 * the JsUnassignedEvent and must be taken from `events[].JsUnassignedEvent.value.reassignmentId`.
 * `eventFormat` is required; without it the server returns an empty events array.
 */
export async function reassignContractToGlobal(
    ledgerProvider: SDKContext['ledgerProvider'],
    submitter: string,
    contractId: string,
    source: string,
    target: string
): Promise<void> {
    const unassignResponse = (await ledgerProvider.request({
        method: 'ledgerApi',
        params: {
            resource: '/v2/commands/submit-and-wait-for-reassignment',
            requestMethod: 'post',
            body: {
                reassignmentCommands: {
                    commandId: crypto.randomUUID(),
                    submitter,
                    commands: [
                        {
                            command: {
                                UnassignCommand: {
                                    value: { contractId, source, target },
                                },
                            },
                        },
                    ],
                },
                eventFormat: { filtersByParty: { [submitter]: {} } },
            },
        },
    })) as ReassignmentResponse

    const unassignEvent = unassignResponse.reassignment.events
        .map((e) => e.JsUnassignedEvent?.value)
        .find(Boolean)
    if (!unassignEvent)
        throw new Error('UnassignedEvent not found in reassignment response')
    const reassignmentId: string = unassignEvent.reassignmentId

    await ledgerProvider.request({
        method: 'ledgerApi',
        params: {
            resource: '/v2/commands/submit-and-wait-for-reassignment',
            requestMethod: 'post',
            body: {
                reassignmentCommands: {
                    commandId: crypto.randomUUID(),
                    submitter,
                    commands: [
                        {
                            command: {
                                AssignCommand: {
                                    value: { reassignmentId, source, target },
                                },
                            },
                        },
                    ],
                },
            },
        },
    })
}

export interface SettleParams {
    otcTradeCid: string
    legIdAlice: string
    legIdBob: string
    testTokenAllocationCid: string
}

export async function settleOtcTrade(
    setup: MultiSyncSetup,
    params: SettleParams,
    logger: Logger
): Promise<void> {
    const {
        p3Sdk,
        tokenP1,
        alice,
        tradingApp,
        globalSynchronizerId,
        scanProxy,
    } = setup
    const { otcTradeCid, legIdAlice, legIdBob, testTokenAllocationCid } = params

    const allocationsAlice = await tokenP1.allocation.pending(alice.partyId)
    const amuletAllocation = allocationsAlice.find(
        (a) => a.interfaceViewValue.allocation.transferLegId === legIdAlice
    )
    if (!amuletAllocation) throw new Error('Amulet allocation not found')

    const amuletExecCtx = await scanProxy.fetchExecuteTransferContext(
        amuletAllocation.contractId
    )

    const allocationsWithContext = {
        [legIdAlice]: {
            _1: amuletAllocation.contractId,
            _2: {
                context: {
                    ...(amuletExecCtx.choiceContextData ?? {}),
                    values:
                        (amuletExecCtx.choiceContextData?.values as Record<
                            string,
                            unknown
                        >) ?? {},
                },
                meta: { values: {} },
            },
        },
        [legIdBob]: {
            _1: testTokenAllocationCid,
            _2: { context: { values: {} }, meta: { values: {} } },
        },
    }

    // Amulet system contracts from scan proxy; synchronizerId='' → Canton infers from blob
    // Bob's TestToken allocation is NOT disclosed: after explicit reassignment P3 has it in ACS.
    const disclosedContracts = (amuletExecCtx.disclosedContracts ?? []).map(
        (c) => ({ ...c, synchronizerId: '' })
    )

    await p3Sdk.ledger
        .prepare({
            partyId: tradingApp.partyId,
            commands: [
                {
                    ExerciseCommand: {
                        templateId: `${TRADING_APP_PREFIX}:OTCTrade`,
                        contractId: otcTradeCid,
                        choice: 'OTCTrade_Settle',
                        choiceArgument: { allocationsWithContext },
                    },
                },
            ],
            disclosedContracts,
            synchronizerId: globalSynchronizerId,
        })
        .sign(tradingApp.keyPair.privateKey)
        .execute({ partyId: tradingApp.partyId })

    logger.info(
        'TradingApp: OTCTrade settled — 100 Amulet transferred to Bob, 20 TestToken transferred to Alice'
    )
}

export interface TransferParams {
    aliceTokenCid: string
    tokenRulesCid: string
    tokenRulesContract: AcsContractEntry
}

export async function transferTokenToAppSync(
    setup: MultiSyncSetup,
    params: TransferParams,
    logger: Logger
): Promise<void> {
    const { p1Sdk, alice, bob, appSynchronizerId } = setup
    const { aliceTokenCid, tokenRulesCid, tokenRulesContract } = params

    await p1Sdk.ledger
        .prepare({
            partyId: alice.partyId,
            commands: [
                {
                    ExerciseCommand: {
                        templateId: TRANSFER_FACTORY_IFACE,
                        contractId: tokenRulesCid,
                        choice: 'TransferFactory_Transfer',
                        choiceArgument: {
                            expectedAdmin: bob.partyId,
                            transfer: {
                                sender: alice.partyId,
                                receiver: alice.partyId,
                                amount: '20',
                                instrumentId: {
                                    admin: bob.partyId,
                                    id: 'TestToken',
                                },
                                requestedAt: new Date(
                                    Date.now() - 60_000
                                ).toISOString(),
                                executeBefore: new Date(
                                    Date.now() + 86_400_000
                                ).toISOString(),
                                inputHoldingCids: [aliceTokenCid],
                                meta: { values: {} },
                            },
                            extraArgs: {
                                context: { values: {} },
                                meta: { values: {} },
                            },
                        },
                    },
                },
            ],
            disclosedContracts: [
                {
                    templateId: tokenRulesContract.templateId,
                    contractId: tokenRulesCid,
                    createdEventBlob: tokenRulesContract.createdEventBlob!,
                    synchronizerId: tokenRulesContract.synchronizerId,
                },
            ],
            synchronizerId: appSynchronizerId,
        })
        .sign(alice.keyPair.privateKey)
        .execute({ partyId: alice.partyId })

    logger.info(
        'Alice: TestToken self-transferred to app-synchronizer via TransferFactory_Transfer'
    )
}
