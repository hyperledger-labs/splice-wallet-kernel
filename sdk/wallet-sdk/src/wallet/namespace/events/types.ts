// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AuthTokenProvider } from '@canton-network/core-wallet-auth'
import { PartyId } from '@canton-network/core-types'
import { JsGetUpdatesResponse } from '@canton-network/core-ledger-client-types'
import { CommonCtx } from '../../sdk'

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

export type EventsContext = {
    commonCtx: CommonCtx
    auth: AuthTokenProvider
    websocketURL: string
}

export type Event = JsGetUpdatesResponse
