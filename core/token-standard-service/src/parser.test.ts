// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { jest, describe, it, expect, beforeEach } from '@jest/globals'

import {
    TransactionParser,
    type PrettyTransactions,
    Transaction,
    TransferObject,
} from '@canton-network/core-tx-parser'

import eventsByContractIdResponses from './test-data/mock/eventsByContractIdResponses.js'
import { v3_4 } from '@canton-network/core-ledger-client-types'
import * as fs from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { CoreService } from './token-standard-service.js'
import { AccessTokenProvider } from '@canton-network/core-wallet-auth'
import { LedgerProvider } from '@canton-network/core-provider-ledger'

type Primitive = string | number | boolean | bigint | symbol | null | undefined
type Compat<T> = T extends Primitive
    ? T
    : T extends Array<infer U>
      ? Array<Compat<U>>
      : T extends ReadonlyArray<infer U>
        ? ReadonlyArray<Compat<U>>
        : T extends object
          ? { [K in keyof T]?: Compat<T[K]> }
          : T

type JsTransaction = Compat<v3_4.components['schemas']['JsTransaction']>
type JsGetEventsByContractIdResponse = Compat<
    v3_4.components['schemas']['JsGetEventsByContractIdResponse']
>

type CreatedEvent = Compat<v3_4.components['schemas']['CreatedEvent']>

type JsGetUpdatesResponse = Compat<
    v3_4.components['schemas']['JsGetUpdatesResponse']
>
const EVENTS_BY_CID_PATH = '/v2/events/events-by-contract-id' as const

const __filename = fileURLToPath(import.meta.url)
const testDataDir = `${dirname(__filename)}/test-data`

const makeLedgerProviderMock = (
    responses: JsGetEventsByContractIdResponse[]
): jest.Mocked<LedgerProvider> => {
    const responseByCid = new Map<string, JsGetEventsByContractIdResponse>(
        responses.map((response) => [
            (response.created!.createdEvent as CreatedEvent).contractId,
            response,
        ])
    )

    /*eslint-disable @typescript-eslint/no-explicit-any */
    const request = jest.fn(async (args: any) => {
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

    return { request } as unknown as jest.Mocked<LedgerProvider>
}

// const txsMock: JsTransaction[] = JSON.parse(
//     fs.readFileSync(`${testDataDir}/mock/txs.json`, 'utf-8')
// )
// const txsExpected: Transaction[] = JSON.parse(
//     fs.readFileSync(`${testDataDir}/expected/txs.json`, 'utf-8')
// )
const aliceTransferObjectsExpected: TransferObject[] = JSON.parse(
    fs.readFileSync(
        `${testDataDir}/expected/alice-transfer-objects.json`,
        'utf-8'
    )
)
const bobTransferObjectsExpected: TransferObject[] = JSON.parse(
    fs.readFileSync(
        `${testDataDir}/expected/bob-transfer-objects.json`,
        'utf-8'
    )
)

const mockAccessTokenProvider = {} as unknown as AccessTokenProvider

describe('TransactionParser', () => {
    let mockProvider: jest.Mocked<LedgerProvider>
    const txsMock: JsTransaction[] = JSON.parse(
        fs.readFileSync(`${testDataDir}/mock/txs.json`, 'utf-8')
    )
    const txsExpected: Transaction[] = JSON.parse(
        fs.readFileSync(`${testDataDir}/expected/txs.json`, 'utf-8')
    )

    beforeEach(() => {
        jest.clearAllMocks()
        mockProvider = makeLedgerProviderMock(eventsByContractIdResponses)
    })

    it('parses full mock input and matches JSON output', async () => {
        const partyId = 'alice::normalized'

        const actual = await Promise.all(
            txsMock.map((tx: any) => {
                const parser = new TransactionParser(
                    mockProvider,
                    tx,
                    partyId,
                    false
                )
                return parser.parseTransaction()
            })
        )
        expect(actual).toEqual(txsExpected)
        expect(mockProvider.request).toHaveBeenCalled()
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

    it('correctly parses utilities events as sender', async () => {
        const data = fs.readFileSync(
            `${testDataDir}/mock/utility-payload-ledger-effects.json`,
            'utf-8'
        )
        const result = fs.readFileSync(
            `${testDataDir}/expected/utility-payload-ledger-effects-sender.json`,
            'utf-8'
        )

        const updates: JsGetUpdatesResponse[] = JSON.parse(data)
        const partyId =
            'test-sender::122073884bbde76324a563e585afc3f3f9cc309d8d28f36424bd899a364f5e0a6fad'

        const core = new CoreService(
            mockProvider,
            console,
            mockAccessTokenProvider,
            false
        )
        const pretty = await core.toPrettyTransactions(updates, partyId)
        const prettyResult: PrettyTransactions = JSON.parse(result)
        expect(pretty).toEqual(prettyResult)
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

        expect(actual).toEqual(aliceTransferObjectsExpected)
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

        expect(actual).toEqual(bobTransferObjectsExpected)
    })
})
