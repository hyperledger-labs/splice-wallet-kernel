// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationService } from './notification-service.js'
import { SESSION_SCOPED_EVENTS, USER_SCOPED_EVENTS } from './events.js'
import { type NotificationSink, subscribeNotifications } from './subscribe.js'

const subscriber = { sessionId: 'session-1', userId: 'user-1' }

function fakeSink() {
    return {
        send: vi.fn<NotificationSink['send']>(),
        close: vi.fn<NotificationSink['close']>(),
    }
}

describe('subscribeNotifications', () => {
    let service: NotificationService
    let sink: ReturnType<typeof fakeSink>

    beforeEach(() => {
        service = new NotificationService({ debug: vi.fn(), error: vi.fn() })
        sink = fakeSink()
    })

    it.each(SESSION_SCOPED_EVENTS)(
        'forwards session-scoped %s events from the session notifier',
        (event) => {
            subscribeNotifications(service, subscriber, sink)

            service.getNotifier('session-1').emit(event, { a: 1 }, 'b')
            service.getNotifier('user-1').emit(event, { ignored: true })

            expect(sink.send).toHaveBeenCalledTimes(1)
            expect(sink.send).toHaveBeenCalledWith(event, [{ a: 1 }, 'b'])
        }
    )

    it.each(USER_SCOPED_EVENTS)(
        'forwards user-scoped %s events from the user notifier',
        (event) => {
            subscribeNotifications(service, subscriber, sink)

            service.getNotifier('user-1').emit(event, [{ partyId: 'p' }])
            service.getNotifier('session-1').emit(event, { ignored: true })

            expect(sink.send).toHaveBeenCalledTimes(1)
            expect(sink.send).toHaveBeenCalledWith(event, [[{ partyId: 'p' }]])
        }
    )

    it('does not forward events of other sessions or users', () => {
        subscribeNotifications(service, subscriber, sink)

        service.getNotifier('session-2').emit('txChanged', {})
        service.getNotifier('user-2').emit('accountsChanged', [])

        expect(sink.send).not.toHaveBeenCalled()
    })

    it('does not forward unknown events', () => {
        subscribeNotifications(service, subscriber, sink)

        service.getNotifier('session-1').emit('somethingElse', {})

        expect(sink.send).not.toHaveBeenCalled()
    })

    it('fans out to every subscriber of the same session', () => {
        const otherSink = fakeSink()
        subscribeNotifications(service, subscriber, sink)
        subscribeNotifications(service, subscriber, otherSink)

        service.getNotifier('session-1').emit('txChanged', { id: 1 })

        expect(sink.send).toHaveBeenCalledWith('txChanged', [{ id: 1 }])
        expect(otherSink.send).toHaveBeenCalledWith('txChanged', [{ id: 1 }])
    })

    it('stops forwarding after unsubscribe', () => {
        const unsubscribe = subscribeNotifications(service, subscriber, sink)

        unsubscribe()
        service.getNotifier('session-1').emit('txChanged', {})
        service.getNotifier('user-1').emit('accountsChanged', [])

        expect(sink.send).not.toHaveBeenCalled()
        expect(service.getNotifier('session-1').emit('logout')).toBe(false)
        expect(sink.close).not.toHaveBeenCalled()
    })

    it('unsubscribe is idempotent and does not affect other subscribers', () => {
        const otherSink = fakeSink()
        const unsubscribe = subscribeNotifications(service, subscriber, sink)
        subscribeNotifications(service, subscriber, otherSink)

        unsubscribe()
        unsubscribe()
        service.getNotifier('session-1').emit('txChanged', { id: 1 })

        expect(sink.send).not.toHaveBeenCalled()
        expect(otherSink.send).toHaveBeenCalledWith('txChanged', [{ id: 1 }])
    })

    it('closes the sink and unsubscribes on logout, without forwarding it', () => {
        const unsubscribe = subscribeNotifications(service, subscriber, sink)

        service.getNotifier('session-1').emit('logout')

        expect(sink.close).toHaveBeenCalledTimes(1)
        expect(sink.send).not.toHaveBeenCalled()

        service.getNotifier('session-1').emit('txChanged', {})
        service.getNotifier('session-1').emit('logout')
        expect(sink.send).not.toHaveBeenCalled()
        expect(sink.close).toHaveBeenCalledTimes(1)

        // unsubscribing after a logout teardown is a no-op
        expect(() => unsubscribe()).not.toThrow()
    })

    it('keeps delivering to other subscribers when one sink fails', () => {
        const otherSink = fakeSink()
        sink.send.mockImplementation(() => {
            throw new Error('write failed')
        })
        subscribeNotifications(service, subscriber, sink)
        subscribeNotifications(service, subscriber, otherSink)

        expect(() =>
            service.getNotifier('session-1').emit('txChanged', { id: 1 })
        ).not.toThrow()

        expect(sink.send).toHaveBeenCalledTimes(1)
        expect(otherSink.send).toHaveBeenCalledWith('txChanged', [{ id: 1 }])
    })

    it('closes every subscriber of the session on logout', () => {
        const otherSink = fakeSink()
        subscribeNotifications(service, subscriber, sink)
        subscribeNotifications(service, subscriber, otherSink)

        service.getNotifier('session-1').emit('logout')

        expect(sink.close).toHaveBeenCalledTimes(1)
        expect(otherSink.close).toHaveBeenCalledTimes(1)
    })
})
