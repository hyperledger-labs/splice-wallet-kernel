// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { NotificationService } from '@canton-network/core-wallet-services'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { asPort, type FakePort, fakePort } from '@/tests/unit/fake-port'
import {
    handleNotificationPort,
    PortNotificationSink,
    withoutNotificationArgs,
} from './notifications'

const subscriber = { sessionId: 'session-1', userId: 'user-1' }

describe('PortNotificationSink', () => {
    let port: FakePort

    beforeEach(() => {
        port = fakePort()
    })

    it('posts the event with its first argument as params', () => {
        const sink = new PortNotificationSink(asPort(port))

        sink.send('txChanged', [{ status: 'pending', commandId: 'c1' }])

        expect(port.postMessage).toHaveBeenCalledWith({
            method: 'txChanged',
            params: { status: 'pending', commandId: 'c1' },
        })
    })

    it('keeps array arguments (e.g. accountsChanged) as params', () => {
        const sink = new PortNotificationSink(asPort(port))

        sink.send('accountsChanged', [[{ partyId: 'p1' }]])

        expect(port.postMessage).toHaveBeenCalledWith({
            method: 'accountsChanged',
            params: [{ partyId: 'p1' }],
        })
    })

    it('omits params for events without arguments', () => {
        const sink = new PortNotificationSink(asPort(port))

        sink.send('connected', [])

        expect(port.postMessage).toHaveBeenCalledWith({ method: 'connected' })
    })

    it('disconnects the port on close', () => {
        const sink = new PortNotificationSink(asPort(port))

        sink.close()

        expect(port.disconnect).toHaveBeenCalledTimes(1)
    })
})

describe('withoutNotificationArgs', () => {
    it('logs event metadata without the emitted args', () => {
        const logger = { debug: vi.fn(), error: vi.fn() }
        const service = new NotificationService(withoutNotificationArgs(logger))
        const notifier = service.getNotifier('session-1')
        notifier.on('connected', () => {
            throw new Error('listener failed')
        })

        notifier.emit('connected', { session: { accessToken: 'secret' } })

        expect(logger.debug).toHaveBeenCalledWith(
            { event: 'connected' },
            'Notifier emitted event: connected for session-1'
        )
        expect(logger.error).toHaveBeenCalledWith(
            { event: 'connected', err: expect.any(Error) },
            'Notifier listener failed for event: connected for session-1'
        )
        expect(JSON.stringify(logger.debug.mock.calls)).not.toContain('secret')
    })
})

describe('handleNotificationPort', () => {
    let service: NotificationService
    let port: FakePort

    beforeEach(() => {
        service = new NotificationService({ debug: vi.fn(), error: vi.fn() })
        port = fakePort()
    })

    it('forwards session and user notifications to the port', async () => {
        await handleNotificationPort(
            asPort(port),
            service,
            async () => subscriber
        )

        service
            .getNotifier('session-1')
            .emit('txChanged', { status: 'pending' })
        service.getNotifier('user-1').emit('accountsChanged', [])
        service.getNotifier('session-2').emit('txChanged', { other: true })

        expect(port.postMessage.mock.calls).toEqual([
            [{ method: 'txChanged', params: { status: 'pending' } }],
            [{ method: 'accountsChanged', params: [] }],
        ])
        expect(port.disconnect).not.toHaveBeenCalled()
    })

    it('disconnects the port when there is no authenticated session', async () => {
        await handleNotificationPort(
            asPort(port),
            service,
            async () => undefined
        )

        expect(port.disconnect).toHaveBeenCalledTimes(1)
        expect(service.getNotifier('session-1').emit('txChanged', {})).toBe(
            false
        )
    })

    it('disconnects the port when the session lookup fails', async () => {
        await handleNotificationPort(asPort(port), service, async () => {
            throw new Error('store unavailable')
        })

        expect(port.disconnect).toHaveBeenCalledTimes(1)
    })

    it('disconnects the port and stops forwarding on logout', async () => {
        await handleNotificationPort(
            asPort(port),
            service,
            async () => subscriber
        )

        service.getNotifier('session-1').emit('logout')
        service.getNotifier('session-1').emit('txChanged', {})

        expect(port.disconnect).toHaveBeenCalledTimes(1)
        expect(port.postMessage).not.toHaveBeenCalled()
    })

    it('unsubscribes when the content script disconnects', async () => {
        await handleNotificationPort(
            asPort(port),
            service,
            async () => subscriber
        )

        port.remoteDisconnect()

        expect(service.getNotifier('session-1').emit('txChanged', {})).toBe(
            false
        )
        expect(service.getNotifier('user-1').emit('accountsChanged', [])).toBe(
            false
        )
        expect(port.postMessage).not.toHaveBeenCalled()
    })

    it('does not subscribe a port that disconnected during the lookup', async () => {
        let resolve!: (value: typeof subscriber) => void
        const pending = handleNotificationPort(
            asPort(port),
            service,
            () => new Promise((r) => (resolve = r))
        )

        port.remoteDisconnect()
        resolve(subscriber)
        await pending

        expect(service.getNotifier('session-1').emit('txChanged', {})).toBe(
            false
        )
        expect(port.disconnect).not.toHaveBeenCalled()
    })
})
