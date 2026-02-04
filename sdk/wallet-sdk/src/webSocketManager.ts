// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    JsGetUpdatesResponse,
    WebSocketClient,
} from '@canton-network/core-asyncapi-client'
import { PartyId } from '@canton-network/core-types'
import { Logger } from 'pino'

export type UpdatesOptions = {
    beginOffset?: number
    verbose?: boolean
    partyId: PartyId
} & (
    | { interfaceIds: string[]; templateIds?: never }
    | { interfaceIds?: never; templateIds: string[] }
)

export type CompletionOptions = {
    beginOffset?: number
    parties: PartyId[]
    userId: string
}

export class WebSocketSubscriptionError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'WebSocketSubscriptionError'
    }
}

export class InvalidSubscriptionOptionsError extends WebSocketSubscriptionError {
    constructor(message: string) {
        super(message)
        this.name = 'InvalidSubscriptionOptionsError'
    }
}

export class WebSocketConnectionError extends WebSocketSubscriptionError {
    constructor(message: string) {
        super(message)
        this.name = 'WebSocketConnectionError'
    }
}

export class WebSocketManager {
    private wsClient: WebSocketClient
    private logger: Logger

    constructor({
        wsClient,
        logger,
    }: {
        wsClient: WebSocketClient
        logger: Logger
    }) {
        this.wsClient = wsClient
        this.logger = logger.child({ component: 'WebSocketManager' })
    }

    private validateUpdatesOptions(options: UpdatesOptions): void {
        if ('templateIds' in options) {
            const templateIds = Array.isArray(options.templateIds)
                ? options.templateIds
                : [options.templateIds]

            if (templateIds.length === 0) {
                throw new InvalidSubscriptionOptionsError(
                    'templateIds array cannot be empty.'
                )
            }

            const invalidIds = templateIds.filter(
                (id) => typeof id !== 'string'
            )
            if (invalidIds.length > 0) {
                throw new InvalidSubscriptionOptionsError(
                    `All templateIds must be strings. Invalid ids: ${invalidIds.join(
                        ', '
                    )}`
                )
            }
        } else if ('interfaceIds' in options) {
            const interfaceIds = Array.isArray(options.interfaceIds)
                ? options.interfaceIds
                : [options.interfaceIds]

            if (interfaceIds.length === 0) {
                throw new InvalidSubscriptionOptionsError(
                    'interfaceIds array cannot be empty.'
                )
            }

            const invalidIds = interfaceIds.filter(
                (id) => typeof id !== 'string'
            )
            if (invalidIds.length > 0) {
                throw new InvalidSubscriptionOptionsError(
                    `All interfaceIds must be strings. Invalid ids: ${invalidIds.join(
                        ', '
                    )}`
                )
            }
        }

        if (
            options.beginOffset !== undefined &&
            typeof options.beginOffset !== 'number'
        ) {
            throw new InvalidSubscriptionOptionsError(
                'beginOffset must be a number if provided.'
            )
        }
    }

    private normalizeUpdatesOptions(options: UpdatesOptions) {
        {
            if ('templateIds' in options && options.templateIds) {
                return {
                    beginExclusive: options.beginOffset ?? 0,
                    verbose: options.verbose ?? true,
                    partyId: options.partyId,
                    templateIds: Array.isArray(options.templateIds)
                        ? options.templateIds
                        : [options.templateIds],
                }
            } else {
                return {
                    beginExclusive: options.beginOffset ?? 0,
                    verbose: options.verbose ?? true,
                    partyId: options.partyId,
                    interfaceIds: Array.isArray(options.interfaceIds)
                        ? options.interfaceIds
                        : [options.interfaceIds],
                }
            }
        }
    }

    async *subscribeToCompletions(
        options: CompletionOptions
    ): AsyncIterableIterator<JsGetUpdatesResponse> {
        this.logger.info('Subscribing to command completions...')

        const request = {
            beginExclusive: options.beginOffset ?? 0,
            userId: options.userId,
            parties: options.parties,
        }
        yield* this.wsClient.streamCompletions(request)
    }

    /**
     *
     * @param options websocket configuration (partyId, templateId/interfaceId, verbose (default = true))
     * @returns AsyncIterableIterator of Updates
     * @throws InvalidSubscriptionOptionsError if the options is invalid
     * @throws WebSocketConnectionError if connection fails
     */
    async *subscribeToUpdates(
        options: UpdatesOptions
    ): AsyncIterableIterator<JsGetUpdatesResponse> {
        try {
            this.validateUpdatesOptions(options)
            const normalizedOptions = this.normalizeUpdatesOptions(options)
            this.logger.info(
                { options: normalizedOptions },
                'Starting WebSocket subscription with options'
            )
            yield* this.wsClient.streamUpdates(normalizedOptions)
        } catch (error) {
            if (error instanceof InvalidSubscriptionOptionsError) {
                this.logger.error(
                    { error },
                    'Failed to subscribe due to invalid options.'
                )
                throw error
            } else {
                this.logger.error(
                    { error },
                    'Failed to subscribe due to WebSocket connection error.'
                )
                throw new WebSocketConnectionError(
                    'Failed to subscribe due to WebSocket connection error.'
                )
            }
        } finally {
            this.logger.info('WebSocket subscription ended.')
        }
    }
}
