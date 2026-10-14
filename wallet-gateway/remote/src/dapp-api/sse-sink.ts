// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type express from 'express'
import type { Logger } from 'pino'
import type {
    DappNotificationEvent,
    NotificationSink,
    NotificationSubscriber,
} from '@canton-network/core-wallet-services'

function writeSSE(res: express.Response, event: string, data: unknown): void {
    res.write(`event: ${event}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
}

/**
 * Delivers notifications to a dApp over Server-Sent Events.
 *
 * Wire format: one SSE `event` per notification, whose `data` is the JSON
 * encoded array of the arguments the event was emitted with.
 */
export class SseNotificationSink implements NotificationSink {
    constructor(
        private readonly res: express.Response,
        private readonly logger: Logger,
        private readonly subscriber: NotificationSubscriber
    ) {}

    send(event: DappNotificationEvent, args: unknown[]): void {
        this.logger.debug(
            { sessionId: this.subscriber.sessionId, event },
            `Emitting ${event} event via SSE`
        )
        writeSSE(this.res, event, args)
    }

    close(): void {
        this.logger.info(
            { userId: this.subscriber.userId },
            'Session terminated by server. Forcing SSE teardown.'
        )
        this.res.end()
    }
}
