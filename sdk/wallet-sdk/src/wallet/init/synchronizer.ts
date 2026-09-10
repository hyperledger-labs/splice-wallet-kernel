// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    AbstractLedgerProvider,
    Ops,
} from '@canton-network/core-provider-ledger'
import { SDKLogger } from '../logger/logger.js'
import { SDKErrorHandler } from '../error/handler.js'
import { SDKContext } from './types/context.js'

export type ConnectedSynchronizer = NonNullable<
    Ops.GetV2StateConnectedSynchronizers['ledgerApi']['result']['connectedSynchronizers']
>[number]

/**
 * Picks the synchronizer an SDK instance should default to, given everything the
 * participant is connected to. Supplied by the caller — the SDK never guesses.
 */
export type SynchronizerSelector = (
    synchronizers: readonly ConnectedSynchronizer[]
) => string

export type SynchronizerIdOption = string | SynchronizerSelector

/**
 * Returns the synchronizer id for a submission: the explicitly requested one, or
 * the SDK-wide one. An empty string is a deliberate "let the participant route
 * this" and is passed through untouched.
 *
 * @throws when neither is available, which means the participant is connected to
 * several synchronizers and nothing chose between them.
 */
export function requireSynchronizerId(
    ctx: Pick<SDKContext, 'defaultSynchronizerId' | 'error'>,
    explicit?: string
): string {
    if (explicit !== undefined) return explicit
    if (ctx.defaultSynchronizerId !== undefined)
        return ctx.defaultSynchronizerId

    ctx.error.throw({
        type: 'BadRequest',
        message:
            'No synchronizerId was given and the participant is connected to several ' +
            'synchronizers. Pass synchronizerId to this call, or to SDK.create.',
    })
}

/**
 * Resolves the synchronizer an SDK instance defaults to. The connected
 * synchronizers are only fetched when the caller left the choice open; a plain id
 * is taken as-is. Undefined means the participant is connected to several and
 * nothing chose between them, so every call has to name one itself.
 */
export async function resolveSdkSynchronizerId(
    ledgerProvider: AbstractLedgerProvider,
    option: SynchronizerIdOption | undefined,
    logger: SDKLogger,
    error: SDKErrorHandler
): Promise<string | undefined> {
    if (typeof option === 'string') return option

    const response =
        await ledgerProvider.request<Ops.GetV2StateConnectedSynchronizers>({
            method: 'ledgerApi',
            params: {
                resource: '/v2/state/connected-synchronizers',
                requestMethod: 'get',
                query: {},
            },
        })

    const synchronizers = response.connectedSynchronizers ?? []
    if (synchronizers.length === 0) {
        error.throw({
            message: 'No connected synchronizers found',
            type: 'NotFound',
        })
    }
    const ids = synchronizers.map((s) => s.synchronizerId).join(', ')

    if (option !== undefined) {
        const selected = option(synchronizers)
        if (!synchronizers.some((s) => s.synchronizerId === selected)) {
            error.throw({
                type: 'BadRequest',
                message: `Selected synchronizer "${selected}" is not connected. Connected: ${ids}.`,
            })
        }
        return selected
    }

    if (synchronizers.length > 1) {
        logger.warn(
            `Participant is connected to several synchronizers (${ids}); calls must ` +
                'pass an explicit synchronizerId, or SDK.create must be given one.'
        )
        return undefined
    }

    return synchronizers[0].synchronizerId
}
