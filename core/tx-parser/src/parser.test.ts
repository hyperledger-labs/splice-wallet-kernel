// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { LedgerProvider } from '@canton-network/core-provider-ledger'
import type { v3_5, v3_6 } from '@canton-network/core-ledger-client-types'
import { vi, describe, it, expect, beforeEach, type Mocked } from 'vitest'
import { TransactionParser } from './parser.js'
import eventsByContractIdResponsesJsonMixed from './__tests__/data/mock/mixed-events/eventsByContractIdResponses.json'
import txsMockJsonMixed from './__tests__/data/mock/mixed-events/txs.json'
import txsExpectedMixed from './__tests__/data/expected/mixed-events/txs.json'

import aliceTransferObjectsExpectedV1 from './__tests__/data/expected/v1/alice-transfer-objects.json'
import bobTransferObjectsExpectedV1 from './__tests__/data/expected/v1/bob-transfer-objects.json'
import txsMockJsonV1 from './__tests__/data/mock/v1/txs.json'
import txsExpectedV1 from './__tests__/data/expected/v1/txs.json'
import eventsByContractIdResponsesJsonV1 from './__tests__/data/mock/v1/eventsByContractIdResponses.json'

type JsTransaction =
    | v3_5.components['schemas']['JsTransaction']
    | v3_6.components['schemas']['JsTransaction']
type CreatedEvent =
    | v3_5.components['schemas']['CreatedEvent']
    | v3_6.components['schemas']['CreatedEvent']
const EVENTS_BY_CID_PATH = '/v2/events/events-by-contract-id' as const
type JsGetEventsByContractIdResponse =
    | v3_5.components['schemas']['JsGetEventsByContractIdResponse']
    | v3_6.components['schemas']['JsGetEventsByContractIdResponse']
/*oxlint-disable @typescript-eslint/no-explicit-any */

const makeLedgerProviderMock = (
    responses: JsGetEventsByContractIdResponse[]
): Mocked<LedgerProvider> => {
    const responseByCid = new Map<string, JsGetEventsByContractIdResponse>(
        responses.map((response) => [
            (response.created!.createdEvent as CreatedEvent).contractId,
            response,
        ])
    )

    const request = vi.fn(async (args: any) => {
        const { resource } = args.params
        if (resource === '/v2/events/events-by-contract-id') {
            const cid = args.params.body?.contractId

            const entry = responseByCid.get(cid)
            if (!entry) {
                throw {
                    code: 'CONTRACT_EVENTS_NOT_FOUND',
                    message: `No events found for contractId ${cid}`,
                }
            }

            return entry
        }

        if (resource === '/v2/version') {
            return { version: '3.4.12-SNAPSHOT' }
        }

        throw new Error(
            `Unexpected resource in mock LedgerProvider: ${resource} with args: ${args}`
        )
    })

    return { request } as unknown as Mocked<LedgerProvider>
}

describe('transaction parser with v1 events only', () => {
    let mockProvider: Mocked<LedgerProvider>

    const txsMock = txsMockJsonV1 as unknown as JsTransaction[]
    const eventsByContractIdResponses =
        eventsByContractIdResponsesJsonV1 as unknown as JsGetEventsByContractIdResponse[]

    beforeEach(() => {
        mockProvider = makeLedgerProviderMock(eventsByContractIdResponses)
    })

    it('parses full mock input and matches JSON output for v1 events', async () => {
        const partyId = 'alice::normalized'

        console.log(txsMock)
        const actual = await Promise.all(
            txsMock.map((tx) => {
                const parser = new TransactionParser(
                    mockProvider,
                    tx,
                    partyId,
                    false
                )
                return parser.parseTransaction()
            })
        )

        expect(actual).toEqual(txsExpectedV1)
        expect(mockProvider.request).toHaveBeenCalled()
    })

    it('parses transfer objects of the full mock input and matches the expected output from JSON fixtures as alice', async () => {
        const partyId = 'alice::normalized'

        const actual = (
            await Promise.all(
                txsMock.map((txMock) => {
                    const parser = new TransactionParser(
                        mockProvider,
                        txMock,
                        partyId,
                        false
                    )
                    return parser.parseTransferObjects()
                })
            )
        ).flat()

        expect(actual).toEqual(aliceTransferObjectsExpectedV1)
    })

    it('skips an ArchivedEvent when ledger returns CONTRACT_EVENTS_NOT_FOUND', async () => {
        const partyId = 'alice::normalized'

        const missingCid = 'MISSING'
        const tx = {
            updateId: 'u-404',
            offset: 100,
            recordTime: '2025-01-01T00:00:00Z',
            synchronizerId: 'sync-404',
            events: [
                {
                    ArchivedEvent: {
                        contractId: missingCid,
                        nodeId: 1,
                        offset: 100,
                        packageName: 'pkg',
                        templateId: 'Pkg:Temp:Id',
                        witnessParties: [partyId],
                    },
                },
            ],
        } as unknown as JsTransaction

        const parser = new TransactionParser(mockProvider, tx, partyId, false)
        const parsed = await parser.parseTransaction()

        expect(parsed.events).toEqual([])

        expect(mockProvider.request).toHaveBeenCalledWith(
            expect.objectContaining({
                params: expect.objectContaining({
                    resource: EVENTS_BY_CID_PATH,
                    body: expect.objectContaining({ contractId: missingCid }),
                }),
            })
        )
    })

    it('parses transfer objects of the full mock input and matches the expected output from JSON fixtures as bob', async () => {
        const partyId = 'bob::normalized'

        const actual = (
            await Promise.all(
                txsMock.map((txMock) => {
                    const parser = new TransactionParser(
                        mockProvider,
                        txMock,
                        partyId,
                        false
                    )
                    return parser.parseTransferObjects()
                })
            )
        ).flat()

        expect(actual).toEqual(bobTransferObjectsExpectedV1)
    })

    it('preserves the transfer leg for an allocation reservation', async () => {
        const partyId = 'bob::normalized'
        const receiver = 'alice::normalized'
        const transferLeg = {
            sender: partyId,
            receiver,
            amount: '20.0000000000',
            instrumentId: { admin: 'admin::normalized', id: 'Amulet' },
            meta: { values: {} },
        }
        const choiceArgument = {
            expectedAdmin: transferLeg.instrumentId.admin,
            allocation: {
                settlement: {
                    executor: 'venue::normalized',
                    settlementRef: { id: 'OTCTradeProposal', cid: 'trade-cid' },
                    requestedAt: '2026-07-13T16:54:00Z',
                    allocateBefore: '2026-07-13T17:54:00Z',
                    settleBefore: '2026-07-13T18:54:00Z',
                    meta: { values: {} },
                },
                transferLegId: 'leg1',
                transferLeg,
            },
            requestedAt: '2026-07-13T16:53:45Z',
            inputHoldingCids: ['input-cid'],
            extraArgs: { context: { values: {} }, meta: { values: {} } },
        }
        const exerciseResult = {
            output: {
                tag: 'AllocationInstructionResult_Completed',
                value: { allocationCid: 'allocation-cid' },
            },
            senderChangeCids: [],
            meta: {
                values: {
                    'splice.lfdecentralizedtrust.org/sender': partyId,
                    'splice.lfdecentralizedtrust.org/tx-kind': 'transfer',
                },
            },
        }
        const tx = {
            updateId: 'allocation-update',
            offset: 100,
            recordTime: '2026-07-13T16:54:46Z',
            synchronizerId: 'sync',
            events: [
                {
                    ExercisedEvent: {
                        offset: 100,
                        nodeId: 0,
                        contractId: 'factory-cid',
                        templateId: 'pkg:Module:Factory',
                        interfaceId:
                            '#splice-api-token-allocation-instruction-v1:Splice.Api.Token.AllocationInstructionV1:AllocationFactory',
                        choice: 'AllocationFactory_Allocate',
                        choiceArgument,
                        actingParties: [partyId],
                        consuming: false,
                        witnessParties: [partyId],
                        lastDescendantNodeId: 1,
                        exerciseResult,
                        packageName: 'pkg',
                        implementedInterfaces: [],
                    },
                },
                {
                    CreatedEvent: {
                        offset: 100,
                        nodeId: 1,
                        contractId: 'locked-holding-cid',
                        templateId: 'pkg:Module:LockedHolding',
                        createArgument: {},
                        createdEventBlob: '',
                        interfaceViews: [
                            {
                                interfaceId:
                                    '#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding',
                                viewStatus: {
                                    code: 0,
                                    message: '',
                                    details: [],
                                },
                                viewValue: {
                                    owner: partyId,
                                    instrumentId: transferLeg.instrumentId,
                                    amount: transferLeg.amount,
                                    lock: {
                                        holders: ['admin::normalized'],
                                        expiresAt: '2026-07-13T18:54:00Z',
                                        context: `allocation to ${receiver}`,
                                    },
                                    meta: { values: {} },
                                },
                                implementationPackageId: 'pkg',
                            },
                        ],
                        witnessParties: [partyId],
                        signatories: [partyId],
                        observers: [],
                        createdAt: '2026-07-13T16:54:46Z',
                        packageName: 'pkg',
                        representativePackageId: 'pkg',
                        acsDelta: true,
                    },
                },
            ],
        } as unknown as JsTransaction

        const parser = new TransactionParser(mockProvider, tx, partyId, false)
        const parsed = await parser.parseTransaction()

        expect(parsed.events).toHaveLength(1)
        expect(parsed.events[0].label).toMatchObject({
            type: 'MergeSplit',
            tokenStandardChoice: {
                name: 'AllocationFactory_Allocate',
                choiceArgument: {
                    allocation: { transferLeg },
                },
            },
        })
    })
})

describe('transaction parser with mixed v1 and v2 events', () => {
    let mockProvider: Mocked<LedgerProvider>

    const txsMock = (txsMockJsonMixed as any[])
        .filter((u) => u.update && 'Transaction' in u.update)
        .map((u) => u.update.Transaction.value) as JsTransaction[]
    const eventsByContractIdResponses =
        eventsByContractIdResponsesJsonMixed as unknown as JsGetEventsByContractIdResponse[]

    beforeEach(() => {
        mockProvider = makeLedgerProviderMock(eventsByContractIdResponses)
    })

    it('parses full mock input and matches JSON output for mixed events', async () => {
        const partyId = 'alice::normalized'

        const actual = await Promise.all(
            txsMock.map((tx) => {
                const parser = new TransactionParser(
                    mockProvider,
                    tx,
                    partyId,
                    false
                )
                return parser.parseTransaction()
            })
        )

        const events = (id: string) =>
            actual.find((t) => t.updateId === id)!.events
        const label = (id: string, i = 0) => events(id)[i].label

        //V1 choice with nested EventLogs produces 1 v2 derived event
        expect(events('update-5')).toHaveLength(1)
        expect(label('update-5')).toMatchObject({
            type: 'TransferOut',
            receiverAmounts: [
                {
                    receiver: 'aliceValidator::normalized',
                    amount: '100',
                },
            ],
        })
        expect(
            events('update-5')[0].transferInstruction?.status.current?.tag
        ).toBe('Completed')

        // tap = Mint from cip-112/mint
        expect(label('update-7')).toMatchObject({
            type: 'Mint',
            burnAmount: '0',
            mintAmount: '6000',
        })

        //locking for an offer is a self transfer
        expect(label('update-8')).toMatchObject({
            type: 'MergeSplit',
            reason: "lock for transfer to 'bob::normalized'",
        })

        //offer accepted instruction is on TransferOut
        expect(label('update-13', 0).type).toBe('Unlock')
        expect(events('update-13')[0].transferInstruction).toBeNull()

        //non token standard transfer is still parsed via v2 label
        expect(label('update-28')).toMatchObject({
            type: 'TransferIn',
            sender: 'charlie::normalized',
        })

        expect(actual).toEqual(txsExpectedMixed)
        expect(mockProvider.request).toHaveBeenCalled()
    })
})
