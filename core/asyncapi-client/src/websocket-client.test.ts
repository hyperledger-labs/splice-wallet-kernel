// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    vi,
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
    type Mock,
} from 'vitest'
import { WebSocketClient } from './websocket-client.js'
/* oxlint-disable typescript/no-explicit-any */

const MOCK_CHANNELS = vi.hoisted(() => ({
    v2_updates: '/v2/updates',
    v2_commands_completions: '/v2/commands/completions',
}))

const mockEventFilterBySetup = vi.hoisted(() =>
    vi.fn((opts) => ({ filtersByParty: {}, verbose: opts.verbose }))
)
vi.mock('@canton-network/core-ledger-client-types', () => ({
    asyncApiByVersion: {
        '3.5': { CHANNELS: MOCK_CHANNELS },
    },
    supportedAsyncApiVersions: ['3.5'],
    EventFilterBySetup: mockEventFilterBySetup,
}))

class MockWebSocket {
    static OPEN = 1
    static CLOSED = 3
    readyState = MockWebSocket.OPEN

    onopen: (() => void) | null = null
    onmessage: ((e: { data: string }) => void) | null = null
    onerror: (() => void) | null = null
    onclose: ((e: { code: number; reason: string }) => void) | null = null

    send = vi.fn()
    close = vi.fn()

    triggerOpen() {
        this.onopen?.()
    }
    triggerMessage(data: unknown) {
        this.onmessage?.({ data: JSON.stringify(data) })
    }
    triggerError() {
        this.onerror?.()
    }
    triggerClose(code = 1000, reason = '') {
        this.readyState = MockWebSocket.CLOSED
        this.onclose?.({ code, reason })
    }
}

let lastWsInstance: MockWebSocket

const makeClient = (version?: '3.5') => {
    const accessTokenProvider = {
        getAccessToken: vi.fn().mockResolvedValue('test-token'),
        getAuthContext: vi.fn().mockResolvedValue(''),
    }
    const client = new WebSocketClient({
        baseUrl: 'wss://fake',
        accessTokenProvider,
        ...(version ? { version } : {}),
    })

    return { client, accessTokenProvider }
}

async function collectAll<T>(gen: AsyncIterableIterator<T>): Promise<T[]> {
    const results: T[] = []

    for await (const item of gen) results.push(item)
    return results
}
let wsMock: Mock

describe('Async api service', () => {
    beforeEach(() => {
        wsMock = vi.fn(function (_url: string, _protocols: string[]) {
            lastWsInstance = new MockWebSocket()
            return lastWsInstance
        })
        Object.assign(wsMock, {
            OPEN: MockWebSocket.OPEN,
            CLOSED: MockWebSocket.CLOSED,
        })
        vi.stubGlobal('WebSocket', wsMock)
    })

    afterEach(() => {
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    it('should init()', async () => {
        const { client, accessTokenProvider } = makeClient()

        await client.init()
        expect(accessTokenProvider.getAccessToken).toHaveBeenCalledOnce()
        expect((client as any).token).toBe('test-token')
        expect((client as any).protocol).toEqual([
            'jwt.token.test-token',
            'daml.ws.auth',
        ])
    })
    it('should initiailize the client properly for updates', async () => {
        const { client } = makeClient()

        const gen = client['generate'](`wss://ledger/v2/updates`, {
            beginExclusive: 0,
            updateFormat: {},
        } as any)

        const collectPromise = collectAll(gen)

        await vi.waitFor(() => expect(wsMock).toHaveBeenCalled())

        expect(wsMock).toHaveBeenCalledWith(`wss://ledger/v2/updates`, [
            'jwt.token.test-token',
            'daml.ws.auth',
        ])

        lastWsInstance.triggerOpen()
        lastWsInstance.triggerClose()

        await collectPromise
    })

    it('send a serialized request on open', async () => {
        const { client } = makeClient()
        const request = {
            beginExclusive: 10,
            updateFormat: {},
        }
        const gen = client['generate'](
            `wss://ledger/v2/updates`,
            request as any
        )

        const collectPromise = collectAll(gen)

        await vi.waitFor(() => expect(wsMock).toHaveBeenCalled())
        lastWsInstance.triggerOpen()

        await vi.waitFor(() =>
            expect(lastWsInstance.send).toHaveBeenCalledOnce()
        )

        expect(lastWsInstance.send).toHaveBeenCalledWith(
            JSON.stringify(request)
        )

        lastWsInstance.triggerClose()

        await collectPromise
    })

    it('streams updates', async () => {
        const { client } = makeClient()

        const gen = client.streamUpdates({
            beginExclusive: 0,
            templateIds: ['ping'],
        })

        const collectPromise = collectAll(gen)
        await vi.waitFor(() => expect(wsMock).toHaveBeenCalled())

        const [[url]] = wsMock.mock.calls
        expect(url).toBe(`wss://fake/v2/updates`)
        lastWsInstance.triggerOpen()
        lastWsInstance.triggerClose()
        await collectPromise
    })

    it('streams updates builds templateId filter', async () => {
        const { client } = makeClient()

        const gen = client.streamUpdates({
            beginExclusive: 10,
            templateIds: ['ping'],
            partyId: 'alice:123',
            verbose: false,
        })

        const collectPromise = collectAll(gen)
        await vi.waitFor(() => expect(wsMock).toHaveBeenCalled())

        lastWsInstance.triggerOpen()
        await vi.waitFor(() => expect(lastWsInstance.send).toHaveBeenCalled())
        const sent = JSON.parse(lastWsInstance.send.mock.calls[0][0])
        expect(mockEventFilterBySetup).toHaveBeenCalledWith({
            templateIds: ['ping'],
            partyId: 'alice:123',
            verbose: false,
        })

        expect(sent.beginExclusive).toBe(10)
        expect(sent.updateFormat.includeTransactions.eventFormat.verbose).toBe(
            false
        )
        expect(sent).not.toHaveProperty('filter')
        expect(sent).not.toHaveProperty('verbose')
        lastWsInstance.triggerClose()
        await collectPromise
    })

    it('streams updates builds interface filter', async () => {
        const { client } = makeClient()

        const gen = client.streamUpdates({
            beginExclusive: 10,
            interfaceIds: ['ping'],
            partyId: 'alice:123',
            verbose: false,
        })

        const collectPromise = collectAll(gen)
        await vi.waitFor(() => expect(wsMock).toHaveBeenCalled())

        lastWsInstance.triggerOpen()
        await vi.waitFor(() => expect(lastWsInstance.send).toHaveBeenCalled())
        const sent = JSON.parse(lastWsInstance.send.mock.calls[0][0])
        expect(mockEventFilterBySetup).toHaveBeenCalledWith({
            interfaceIds: ['ping'],
            partyId: 'alice:123',
            verbose: false,
        })

        expect(sent.beginExclusive).toBe(10)
        expect(sent.updateFormat.includeTransactions.eventFormat.verbose).toBe(
            false
        )
        expect(sent).not.toHaveProperty('endInclusive')
        lastWsInstance.triggerClose()
        await collectPromise
    })

    it('streams updates includes endInclusive when provided', async () => {
        const { client } = makeClient()

        const gen = client.streamUpdates({
            beginExclusive: 10,
            endInclusive: 99,
            interfaceIds: ['ping'],
            partyId: 'alice:123',
            verbose: false,
        })

        const collectPromise = collectAll(gen)
        await vi.waitFor(() => expect(wsMock).toHaveBeenCalled())

        lastWsInstance.triggerOpen()
        await vi.waitFor(() => expect(lastWsInstance.send).toHaveBeenCalled())
        const sent = JSON.parse(lastWsInstance.send.mock.calls[0][0])
        expect(mockEventFilterBySetup).toHaveBeenCalledWith({
            interfaceIds: ['ping'],
            partyId: 'alice:123',
            verbose: false,
        })

        expect(sent.beginExclusive).toBe(10)
        expect(sent.endInclusive).toBe(99)
        expect(sent.updateFormat.includeTransactions.eventFormat.verbose).toBe(
            false
        )
        lastWsInstance.triggerClose()
        await collectPromise
    })

    it('streams completions', async () => {
        const { client } = makeClient()

        const gen = client.streamCompletions({
            beginExclusive: 10,
            userId: 'ledger-api-user',
            parties: ['alice:123', 'bob:234'],
        })

        const collectPromise = collectAll(gen)

        await vi.waitFor(() => expect(wsMock).toHaveBeenCalled())
        const [[url]] = wsMock.mock.calls
        expect(url).toBe(`wss://fake/v2/commands/completions`)
        lastWsInstance.triggerOpen()
        await vi.waitFor(() => expect(lastWsInstance.send).toHaveBeenCalled())

        const sent = JSON.parse(lastWsInstance.send.mock.calls[0][0])
        expect(sent).toEqual({
            beginExclusive: 10,
            userId: 'ledger-api-user',
            parties: ['alice:123', 'bob:234'],
        })

        lastWsInstance.triggerClose()
        await collectPromise
    })

    it('preserves order of messages', async () => {
        const { client } = makeClient()

        const gen = client['generate'](`wss://ledger/v2/updates`, {} as any)

        const collectPromise = collectAll(gen)

        await vi.waitFor(() => expect(wsMock).toHaveBeenCalled())
        lastWsInstance.triggerOpen()
        lastWsInstance.triggerMessage({ offset: 1, event: 'a' })
        lastWsInstance.triggerMessage({ offset: 2, event: 'b' })
        lastWsInstance.triggerMessage({ offset: 3, event: 'c' })
        lastWsInstance.triggerClose()

        const results = await collectPromise

        expect(results).toEqual([
            { offset: 1, event: 'a' },
            { offset: 2, event: 'b' },
            { offset: 3, event: 'c' },
        ])
    })

    it('closes the WebSocket when the consumer stops the stream early', async () => {
        const { client } = makeClient()
        const stream = client.streamCompletions({
            beginExclusive: 0,
            userId: 'ledger-api-user',
            parties: ['alice:123'],
        })

        const completion = { completion: { commandId: 'command-1' } }
        const consumeFirst = async () => {
            for await (const message of stream) {
                expect(message).toEqual(completion)
                break
            }
        }
        const consumed = consumeFirst()
        await vi.waitFor(() => expect(wsMock).toHaveBeenCalledOnce())
        lastWsInstance.triggerOpen()
        expect(lastWsInstance.close).not.toHaveBeenCalled()
        lastWsInstance.triggerMessage(completion)

        await consumed

        expect(lastWsInstance.close).toHaveBeenCalledOnce()
    })

    it('throws an error properly on triggerError', async () => {
        const { client } = makeClient()

        const gen = client['generate'](`wss://ledger/v2/updates`, {} as any)

        const collectPromise = collectAll(gen)

        await vi.waitFor(() => expect(wsMock).toHaveBeenCalled())
        lastWsInstance.triggerOpen()
        lastWsInstance.triggerError()

        await expect(collectPromise).rejects.toThrow(
            'WebSocket Handshake/Connection failed'
        )
    })

    it('flushes buffered messages before close', async () => {
        const { client } = makeClient()

        const gen = client['generate'](`wss://ledger/v2/updates`, {} as any)

        const collectPromise = collectAll(gen)

        await vi.waitFor(() => expect(wsMock).toHaveBeenCalled())
        lastWsInstance.triggerOpen()
        lastWsInstance.triggerMessage({ offset: 1, event: 'a' })
        lastWsInstance.triggerMessage({ offset: 2, event: 'b' })
        lastWsInstance.triggerClose()

        const results = await collectPromise

        expect(results).toEqual([
            { offset: 1, event: 'a' },
            { offset: 2, event: 'b' },
        ])
    })
})
