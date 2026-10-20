// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { LedgerProvider } from '@canton-network/core-provider-ledger'
import type { v3_5, v3_6 } from '@canton-network/core-ledger-client-types'
import { vi, describe, it, expect, beforeEach, type Mocked } from 'vitest'
import { TransactionParser } from './parser.js'
import eventsByContractIdResponsesJson from './__tests__/data/mock/eventsByContractIdResponses.json'
// import aliceTransferObjectsExpected from './__tests__/data/expected/alice-transfer-objects.json'
// import bobTransferObjectsExpected from './__tests__/data/expected/bob-transfer-objects.json'
import txsMockJson from './__tests__/data/mock/txs.json'
import txsExpected from './__tests__/data/expected/txs.json'
// import { writeFile } from 'node:fs/promises'

type JsTransaction =
    | v3_5.components['schemas']['JsTransaction']
    | v3_6.components['schemas']['JsTransaction']
type CreatedEvent =
    | v3_5.components['schemas']['CreatedEvent']
    | v3_6.components['schemas']['CreatedEvent']
// const EVENTS_BY_CID_PATH = '/v2/events/events-by-contract-id' as const
type JsGetEventsByContractIdResponse =
    | v3_5.components['schemas']['JsGetEventsByContractIdResponse']
    | v3_6.components['schemas']['JsGetEventsByContractIdResponse']
/*

Error: Not a #splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferInstruction
 but a #package-name:Splice.Api.Token.HoldingV1:Holding: {"contractId":"48","contractKey":null,"createArgument":{"amulet":{"amount":{"createdAt":{"number":"1"},"initialAmount":"1064.0015220800","ratePerRound":{"rate":"0.0038051800"}},"dso":"dso::normalized","owner":"alice::normalized"},"lock":{"expiresAt":"2025-06-18T00:00:00.000000Z","holders":["dso::normalized"],"optContext":"transfer to 'bob::normalized'"}},"createdAt":"1971-01-01T00:00:42.000420Z","createdEventBlob":"","interfaceViews":[{"interfaceId":"#package-name:Splice.Api.Token.HoldingV1:Holding","viewStatus":{"code":0,"details":[],"message":""},"viewValue":{"amount":"1064.0015220800","instrumentId":{"admin":"dso::normalized","id":"Amulet"},"lock":{"context":"transfer to 'bob::normalized'","expiresAfter":null,"expiresAt":"2025-06-18T00:00:00.000000Z","holders":["dso::normalized"]},"meta":{"values":{"amulet.splice.lfdecentralizedtrust.org/created-in-round":"1","amulet.splice.lfdecentralizedtrust.org/rate-per-round":"0.00380518"}},"owner":"alice::normalized"}}],"nodeId":12,"observers":[],"offset":42,"packageName":"splice-amulet","signatories":["dso::normalized","alice::normalized"],"templateId":"#package-name:Splice.Amulet:LockedAmulet","witnessParties":["alice::normalized"]}
*/
// The fixtures were recorded with a ledger API version that predates the required
// `representativePackageId` and `acsDelta` event fields, which the parser does not read.
// const txsMock = txsMockJson as unknown as JsTransaction[]
const eventsByContractIdResponses =
    eventsByContractIdResponsesJson as unknown as JsGetEventsByContractIdResponse[]

const makeLedgerProviderMock = (
    responses: JsGetEventsByContractIdResponse[]
): Mocked<LedgerProvider> => {
    const responseByCid = new Map<string, JsGetEventsByContractIdResponse>(
        responses.map((response) => [
            (response.created!.createdEvent as CreatedEvent).contractId,
            response,
        ])
    )

    /*eslint-disable @typescript-eslint/no-explicit-any */
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

describe('transaction parser', () => {
    let mockProvider: Mocked<LedgerProvider>

    beforeEach(() => {
        mockProvider = makeLedgerProviderMock(eventsByContractIdResponses)
    })

    it('parses full mock input and matches JSON output', async () => {
        const partyId = 'alice::normalized'

        const txsMock = (txsMockJson as any[])
            .filter((u) => u.update && 'Transaction' in u.update)
            .map((u) => u.update.Transaction.value) as JsTransaction[]

        console.log(Object.keys(txsMock[0]))

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

        // const filePath: string = './output.txt'

        // try {
        //     await writeFile(filePath, JSON.stringify(actual), 'utf-8')
        //     console.log('File written successfully!')
        // } catch (error) {
        //     console.error('Error writing file:', error)
        // }

        expect(actual).toEqual(txsExpected)
        expect(mockProvider.request).toHaveBeenCalled()
    })

    // it('parses transfer objects of the full mock input and matches the expected output from JSON fixtures as alice', async () => {
    //     const partyId = 'alice::normalized'

    //     const actual = (
    //         await Promise.all(
    //             txsMock.map((txMock) => {
    //                 const parser = new TransactionParser(
    //                     mockProvider,
    //                     txMock,
    //                     partyId,
    //                     false
    //                 )
    //                 return parser.parseTransferObjects()
    //             })
    //         )
    //     ).flat()

    //     expect(actual).toEqual(aliceTransferObjectsExpected)
    // })

    // it('skips an ArchivedEvent when ledger returns CONTRACT_EVENTS_NOT_FOUND', async () => {
    //     const partyId = 'alice::normalized'

    //     const missingCid = 'MISSING'
    //     const tx = {
    //         updateId: 'u-404',
    //         offset: 100,
    //         recordTime: '2025-01-01T00:00:00Z',
    //         synchronizerId: 'sync-404',
    //         events: [
    //             {
    //                 ArchivedEvent: {
    //                     contractId: missingCid,
    //                     nodeId: 1,
    //                     offset: 100,
    //                     packageName: 'pkg',
    //                     templateId: 'Pkg:Temp:Id',
    //                     witnessParties: [partyId],
    //                 },
    //             },
    //         ],
    //     } as unknown as JsTransaction

    //     const parser = new TransactionParser(mockProvider, tx, partyId, false)
    //     const parsed = await parser.parseTransaction()

    //     expect(parsed.events).toEqual([])

    //     expect(mockProvider.request).toHaveBeenCalledWith(
    //         expect.objectContaining({
    //             params: expect.objectContaining({
    //                 resource: EVENTS_BY_CID_PATH,
    //                 body: expect.objectContaining({ contractId: missingCid }),
    //             }),
    //         })
    //     )
    // })

    // it('parses transfer objects of the full mock input and matches the expected output from JSON fixtures as bob', async () => {
    //     const partyId = 'bob::normalized'

    //     const actual = (
    //         await Promise.all(
    //             txsMock.map((txMock) => {
    //                 const parser = new TransactionParser(
    //                     mockProvider,
    //                     txMock,
    //                     partyId,
    //                     false
    //                 )
    //                 return parser.parseTransferObjects()
    //             })
    //         )
    //     ).flat()

    //     expect(actual).toEqual(bobTransferObjectsExpected)
    // })

    // it('preserves the transfer leg for an allocation reservation', async () => {
    //     const partyId = 'bob::normalized'
    //     const receiver = 'alice::normalized'
    //     const transferLeg = {
    //         sender: partyId,
    //         receiver,
    //         amount: '20.0000000000',
    //         instrumentId: { admin: 'admin::normalized', id: 'Amulet' },
    //         meta: { values: {} },
    //     }
    //     const choiceArgument = {
    //         expectedAdmin: transferLeg.instrumentId.admin,
    //         allocation: {
    //             settlement: {
    //                 executor: 'venue::normalized',
    //                 settlementRef: { id: 'OTCTradeProposal', cid: 'trade-cid' },
    //                 requestedAt: '2026-07-13T16:54:00Z',
    //                 allocateBefore: '2026-07-13T17:54:00Z',
    //                 settleBefore: '2026-07-13T18:54:00Z',
    //                 meta: { values: {} },
    //             },
    //             transferLegId: 'leg1',
    //             transferLeg,
    //         },
    //         requestedAt: '2026-07-13T16:53:45Z',
    //         inputHoldingCids: ['input-cid'],
    //         extraArgs: { context: { values: {} }, meta: { values: {} } },
    //     }
    //     const exerciseResult = {
    //         output: {
    //             tag: 'AllocationInstructionResult_Completed',
    //             value: { allocationCid: 'allocation-cid' },
    //         },
    //         senderChangeCids: [],
    //         meta: {
    //             values: {
    //                 'splice.lfdecentralizedtrust.org/sender': partyId,
    //                 'splice.lfdecentralizedtrust.org/tx-kind': 'transfer',
    //             },
    //         },
    //     }
    //     const tx = {
    //         updateId: 'allocation-update',
    //         offset: 100,
    //         recordTime: '2026-07-13T16:54:46Z',
    //         synchronizerId: 'sync',
    //         events: [
    //             {
    //                 ExercisedEvent: {
    //                     offset: 100,
    //                     nodeId: 0,
    //                     contractId: 'factory-cid',
    //                     templateId: 'pkg:Module:Factory',
    //                     interfaceId:
    //                         '#splice-api-token-allocation-instruction-v1:Splice.Api.Token.AllocationInstructionV1:AllocationFactory',
    //                     choice: 'AllocationFactory_Allocate',
    //                     choiceArgument,
    //                     actingParties: [partyId],
    //                     consuming: false,
    //                     witnessParties: [partyId],
    //                     lastDescendantNodeId: 1,
    //                     exerciseResult,
    //                     packageName: 'pkg',
    //                     implementedInterfaces: [],
    //                 },
    //             },
    //             {
    //                 CreatedEvent: {
    //                     offset: 100,
    //                     nodeId: 1,
    //                     contractId: 'locked-holding-cid',
    //                     templateId: 'pkg:Module:LockedHolding',
    //                     createArgument: {},
    //                     createdEventBlob: '',
    //                     interfaceViews: [
    //                         {
    //                             interfaceId:
    //                                 '#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding',
    //                             viewStatus: {
    //                                 code: 0,
    //                                 message: '',
    //                                 details: [],
    //                             },
    //                             viewValue: {
    //                                 owner: partyId,
    //                                 instrumentId: transferLeg.instrumentId,
    //                                 amount: transferLeg.amount,
    //                                 lock: {
    //                                     holders: ['admin::normalized'],
    //                                     expiresAt: '2026-07-13T18:54:00Z',
    //                                     context: `allocation to ${receiver}`,
    //                                 },
    //                                 meta: { values: {} },
    //                             },
    //                             implementationPackageId: 'pkg',
    //                         },
    //                     ],
    //                     witnessParties: [partyId],
    //                     signatories: [partyId],
    //                     observers: [],
    //                     createdAt: '2026-07-13T16:54:46Z',
    //                     packageName: 'pkg',
    //                     representativePackageId: 'pkg',
    //                     acsDelta: true,
    //                 },
    //             },
    //         ],
    //     } as unknown as JsTransaction

    //     const parser = new TransactionParser(mockProvider, tx, partyId, false)
    //     const parsed = await parser.parseTransaction()

    //     expect(parsed.events).toHaveLength(1)
    //     expect(parsed.events[0].label).toMatchObject({
    //         type: 'MergeSplit',
    //         tokenStandardChoice: {
    //             name: 'AllocationFactory_Allocate',
    //             choiceArgument: {
    //                 allocation: { transferLeg },
    //             },
    //         },
    //     })
    // })
})
