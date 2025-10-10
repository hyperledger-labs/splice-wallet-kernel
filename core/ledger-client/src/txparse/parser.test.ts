// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { jest, describe, it, expect, beforeEach } from '@jest/globals'

import { TransactionParser } from './parser.js'
import type { Transaction } from './types.js'
import eventsByContractIdResponses from './test-data/mock/eventsByContractIdResponses.js'
import rawTxsMock from './test-data/mock/txs.js'
import txsExpected from './test-data/expected/txs.js'
import type { LedgerClient } from '../ledger-client'
import { components } from '../generated-clients/openapi-3.3.0-SNAPSHOT.js'

type JsTransaction = components['schemas']['JsTransaction']
type JsGetEventsByContractIdResponse =
    components['schemas']['JsGetEventsByContractIdResponse']
type CreatedEvent = components['schemas']['CreatedEvent']

const EVENTS_BY_CID_PATH = '/v2/events/events-by-contract-id' as const
const txsMock = rawTxsMock as unknown as JsTransaction[]

const makeLedgerClientFromEventsResponses = (
    responses: JsGetEventsByContractIdResponse[]
): LedgerClient => {
    const responseByCid = new Map<string, JsGetEventsByContractIdResponse>(
        responses.map((response) => [
            (response.created!.createdEvent as CreatedEvent).contractId,
            response,
        ])
    )

    const getCurrentClientVersion = jest.fn(() => '3.3')
    const post = jest.fn(async (url: string, body: { contractId: string }) => {
        if (url !== EVENTS_BY_CID_PATH) {
            throw new Error(`Unexpected URL in mock LedgerClient: ${url}`)
        }
        const entry = responseByCid.get(body.contractId)
        if (!entry) {
            throw Object.assign(new Error('Not Found'), {
                code: 'CONTRACT_EVENTS_NOT_FOUND',
            })
        }

        return entry
    })

    return { post, getCurrentClientVersion } as unknown as LedgerClient
}

const mockLedgerClient: LedgerClient = makeLedgerClientFromEventsResponses(
    eventsByContractIdResponses
)

describe('TransactionParser', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })
    it('returns transaction header and no events when input has no events', async () => {
        const partyId = 'Alice::122000'

        const tx = {
            updateId: 'update-1',
            offset: 42,
            recordTime: '2025-01-01T00:00:00Z',
            synchronizerId: 'sync-1',
            events: [],
        } as unknown as JsTransaction

        const parser = new TransactionParser(
            tx,
            mockLedgerClient,
            partyId,
            false
        )
        const parsed = await parser.parseTransaction()

        const expected: Transaction = {
            updateId: 'update-1',
            offset: 42,
            recordTime: '2025-01-01T00:00:00Z',
            synchronizerId: 'sync-1',
            events: [],
        }

        expect(parsed).toEqual(expected)
        expect(mockLedgerClient.post).not.toHaveBeenCalled()
    })

    it('parses the full mock input and matches the expected output from JSON fixtures', async () => {
        const partyId = 'alice::normalized'

        const actual: Transaction[] = await Promise.all(
            txsMock.map((txMock) => {
                const parser = new TransactionParser(
                    txMock,
                    mockLedgerClient,
                    partyId,
                    false
                )
                return parser.parseTransaction()
            })
        )

        expect(actual).toEqual(txsExpected)
        expect(mockLedgerClient.post).toHaveBeenCalled()
    })

    it('skips an ArchivedEvent when ledger returns CONTRACT_EVENTS_NOT_FOUND', async () => {
        const partyId = 'alice::normalized'

        // contractId not present in eventsByContractIdResponses that results in 404 from mock LedgerClient
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

        const parser = new TransactionParser(
            tx,
            mockLedgerClient,
            partyId,
            false
        )
        const parsed = await parser.parseTransaction()

        expect(parsed.events).toEqual([])

        // ensure we actually tried to fetch and got the 404 path
        expect((mockLedgerClient.post as jest.Mock).mock.calls).toContainEqual([
            EVENTS_BY_CID_PATH,
            expect.objectContaining({ contractId: missingCid }),
        ])
        await expect(
            (mockLedgerClient.post as jest.Mock).mock.results[0].value
        ).rejects.toMatchObject({ code: 'CONTRACT_EVENTS_NOT_FOUND' })
    })
})
