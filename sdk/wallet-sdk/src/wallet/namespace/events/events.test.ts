// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, vi, beforeEach, expect } from 'vitest'
import type { CompletionOptions, EventsContext, UpdatesOptions } from './types'
import { ctx } from '../../__tests__/mocks'
import { ParsedURL } from '../utils/url'

import { EventsNamespace } from './namespace'

vi.mock('@canton-network/core-asyncapi-client', () => {
    return {
        WebSocketClient: vi.fn(),
    }
})
import { WebSocketClient } from '@canton-network/core-asyncapi-client'

function makeAsyncIterable<T>(items: T[]): AsyncIterableIterator<T> {
    let index = 0
    return {
        [Symbol.asyncIterator]() {
            return this
        },
        async next() {
            if (index < items.length) {
                return { value: items[index++], done: false }
            }
            return { value: undefined as unknown as T, done: true }
        },
    }
}

function buildContext(overrides: Partial<EventsContext> = {}): EventsContext {
    const url = new ParsedURL(ctx, 'ws://localhost:8080')
    return {
        websocketURL: url,
        commonCtx: ctx,
        auth: vi.fn(),
        ...overrides,
    } as unknown as EventsContext
}

describe('events namespace', () => {
    let context: EventsContext
    let mockWsClient: {
        streamUpdates: ReturnType<typeof vi.fn>
        streamCompletions: ReturnType<typeof vi.fn>
    }
    beforeEach(() => {
        mockWsClient = {
            streamUpdates: vi.fn(),
            streamCompletions: vi.fn(),
        }

        vi.mocked(WebSocketClient).mockImplementation(function () {
            return mockWsClient as unknown as WebSocketClient
        })

        context = buildContext()
    })

    it('should stream updates', async () => {
        new EventsNamespace(context)
        expect(WebSocketClient).toHaveBeenCalledWith({
            baseUrl: 'ws://localhost:8080/',
            accessTokenProvider: context.auth,
        })
    })

    it('should stream completions', async () => {
        const mockEvents = [{ commandId: 'cmd-1' }, { commandId: 'cmd-2' }]
        mockWsClient.streamCompletions.mockReturnValue(
            makeAsyncIterable(mockEvents)
        )
        const options: CompletionOptions = { parties: ['alice::abc'] }
        const events = new EventsNamespace(context)
        const results = []
        for await (const event of events.completions(options)) {
            results.push(event)
        }

        expect(mockWsClient.streamCompletions).toHaveBeenCalledWith({
            beginExclusive: 0,
            userId: 'userId',
            parties: ['alice::abc'],
        })
        expect(results).toEqual(mockEvents)
    })

    it('should stream updates with templateIds', async () => {
        const mockEvents = [
            { transactionId: 'tx-1' },
            { transactionId: 'tx-2' },
        ]
        mockWsClient.streamUpdates.mockReturnValue(
            makeAsyncIterable(mockEvents)
        )
        const options: UpdatesOptions = {
            partyId: 'alice::abc',
            templateIds: ['templateId1', 'templateId2'],
        }
        const events = new EventsNamespace(context)
        const results = []
        for await (const event of events.updates(options)) {
            results.push(event)
        }

        expect(mockWsClient.streamUpdates).toHaveBeenCalledWith({
            beginExclusive: 0,
            partyId: 'alice::abc',
            verbose: true,
            templateIds: ['templateId1', 'templateId2'],
        })
        expect(results).toEqual(mockEvents)
    })

    it('should stream updates with interfaceIds', async () => {
        const mockEvents = [
            { transactionId: 'tx-1' },
            { transactionId: 'tx-2' },
        ]
        mockWsClient.streamUpdates.mockReturnValue(
            makeAsyncIterable(mockEvents)
        )
        const options: UpdatesOptions = {
            partyId: 'alice::abc',
            interfaceIds: ['interfaceId1', 'interfaceId2'],
            verbose: false,
        }
        const events = new EventsNamespace(context)
        const results = []
        for await (const event of events.updates(options)) {
            results.push(event)
        }

        expect(mockWsClient.streamUpdates).toHaveBeenCalledWith({
            beginExclusive: 0,
            partyId: 'alice::abc',
            verbose: false,
            interfaceIds: ['interfaceId1', 'interfaceId2'],
        })
        expect(results).toEqual(mockEvents)
    })

    it('throws error when templateids are empty', async () => {
        const events = new EventsNamespace(context)
        await events
            .updates({
                partyId: 'alice::abc',
                templateIds: [],
            })
            .next()

        expect(ctx.error.throw).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'Unexpected',
                message: 'Failed to subscribe due to invalid options.',
            })
        )
    })

    it('throws error when interaceIds are empty', async () => {
        const events = new EventsNamespace(context)
        await events
            .updates({
                partyId: 'alice::abc',
                interfaceIds: [],
            })
            .next()

        expect(ctx.error.throw).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'Unexpected',
                message: 'Failed to subscribe due to invalid options.',
            })
        )
    })
})
