import { jest, describe, it, expect } from '@jest/globals'

import { TransactionParser } from './parser.js'
import type { Transaction } from './types.js'
import eventsByContractIdResponses from './test-data/mock/eventsByContractIdResponses.json'
import txsMock from './test-data/mock/txs.json'
import txsExpected from './test-data/expected/txs.json'
import type { LedgerClient } from '../ledger-client'
import { components } from '../generated-clients/openapi-3.3.0-SNAPSHOT'

type JsTransaction = components['schemas']['JsTransaction']
type JsGetEventsByContractIdResponse =
    components['schemas']['JsGetEventsByContractIdResponse']
type CreatedEvent = components['schemas']['CreatedEvent']

export function makeLedgerClientFromEventsResponses(
    responses: JsGetEventsByContractIdResponse[]
): LedgerClient {
    const responseByCid = new Map<string, JsGetEventsByContractIdResponse>(
        responses.map((response) => [
            (response.created.createdEvent as CreatedEvent).contractId,
            response,
        ])
    )

    const post = jest.fn(async (url: string, body: { contractId: string }) => {
        if (url !== '/v2/events/events-by-contract-id') {
            throw new Error(`Unexpected URL in mock LedgerClient: ${url}`)
        }
        const entry = responseByCid.get(body.contractId)
        if (!entry) {
            const err = new Error('Not Found')
            err.code = 404 // TODO add test for how parser handles 404
            throw err
        }

        return entry
    })

    return { post } as unknown as LedgerClient
}

const mockLedgerClient: LedgerClient = makeLedgerClientFromEventsResponses(
    eventsByContractIdResponses
)

describe('TransactionParser', () => {
    it('returns transaction header and no events when input has no events', async () => {
        const partyId = 'Alice'

        const tx: JsTransaction = {
            updateId: 'update-1',
            offset: 42,
            recordTime: '2025-01-01T00:00:00Z',
            synchronizerId: 'sync-1',
            events: [],
        }

        const parser = new TransactionParser(tx, mockLedgerClient, partyId)
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
                    partyId
                )
                return parser.parseTransaction()
            })
        )

        expect(actual).toEqual(txsExpected)
        expect(mockLedgerClient.post).toHaveBeenCalled()
    })
})
