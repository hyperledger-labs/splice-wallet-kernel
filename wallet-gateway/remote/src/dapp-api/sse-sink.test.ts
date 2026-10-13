// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import type express from 'express'
import { pino } from 'pino'
import { sink } from 'pino-test'
import { SseNotificationSink } from './sse-sink.js'

function fakeResponse() {
    return {
        write: vi.fn(),
        end: vi.fn(),
    }
}

const subscriber = { sessionId: 'session-1', userId: 'user-1' }

describe('SseNotificationSink', () => {
    it('writes each event as an SSE frame with the JSON encoded args', () => {
        const res = fakeResponse()
        const sseSink = new SseNotificationSink(
            res as unknown as express.Response,
            pino(sink()),
            subscriber
        )

        sseSink.send('txChanged', [{ status: 'pending', commandId: 'c1' }])

        expect(res.write.mock.calls.map(([chunk]) => chunk).join('')).toBe(
            'event: txChanged\n' +
                'data: [{"status":"pending","commandId":"c1"}]\n\n'
        )
        expect(res.end).not.toHaveBeenCalled()
    })

    it('ends the response on close', () => {
        const res = fakeResponse()
        const sseSink = new SseNotificationSink(
            res as unknown as express.Response,
            pino(sink()),
            subscriber
        )

        sseSink.close()

        expect(res.end).toHaveBeenCalledTimes(1)
        expect(res.write).not.toHaveBeenCalled()
    })
})
