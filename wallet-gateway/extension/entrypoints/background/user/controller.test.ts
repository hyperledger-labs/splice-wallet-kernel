// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { SigningDriverInterface } from '@canton-network/core-signing-lib'
import {
    NotificationService,
    subscribeNotifications,
} from '@canton-network/core-wallet-services/notification'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthService } from '../auth-service'
import { initializeWalletStore } from '../store'
import { userController } from './controller'

const networkId = 'canton:local-oauth'
const authContext = { userId: 'user-1', accessToken: 'token-1' }

describe('userController.addSession', () => {
    let service: NotificationService
    let controller: ReturnType<typeof userController>

    const fakeSink = () => ({ send: vi.fn(), close: vi.fn() })
    const subscribe = (sessionId: string) => {
        const sink = fakeSink()
        subscribeNotifications(
            service,
            { sessionId, userId: authContext.userId },
            sink
        )
        return sink
    }

    beforeEach(async () => {
        vi.spyOn(AuthService, 'loadAuthContext').mockResolvedValue(authContext)
        service = new NotificationService({ debug: vi.fn(), error: vi.fn() })
        const store = await initializeWalletStore()
        controller = userController(
            async () => store,
            {} as SigningDriverInterface,
            service
        )
    })

    it('closes the notification subscriptions of a replaced session', async () => {
        const first = await controller.addSession({
            origin: 'https://dapp.example',
            networkId,
        })
        const other = await controller.addSession({
            origin: 'https://other.example',
            networkId,
        })
        const firstSink = subscribe(first.id)
        const otherSink = subscribe(other.id)

        const second = await controller.addSession({
            origin: 'https://dapp.example',
            networkId,
        })

        expect(firstSink.close).toHaveBeenCalledTimes(1)
        expect(service.getNotifier(first.id).emit('txChanged', {})).toBe(false)
        expect(otherSink.close).not.toHaveBeenCalled()

        const secondSink = subscribe(second.id)
        service.getNotifier(second.id).emit('txChanged', { status: 'pending' })
        expect(secondSink.send).toHaveBeenCalledWith('txChanged', [
            { status: 'pending' },
        ])
        expect(firstSink.send).not.toHaveBeenCalled()
    })
})
