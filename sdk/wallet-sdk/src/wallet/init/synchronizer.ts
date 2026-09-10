// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    AbstractLedgerProvider,
    Ops,
} from '@canton-network/core-provider-ledger'
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

type SynchronizerCtx = Pick<
    SDKContext,
    'defaultSynchronizerId' | 'ledgerProvider' | 'error'
>

/**
 * Returns the synchronizer id for a submission: the explicitly requested one, the
 * SDK-wide one, or — when nothing chose and the participant is connected to exactly
 * one — that one. An empty string is a deliberate "let the participant route this"
 * and is passed through untouched.
 *
 * @throws when nothing chose and the participant is connected to several
 * synchronizers, since deciding between them is the caller's job.
 */
export async function requireSynchronizerId(
    ctx: SynchronizerCtx,
    explicit?: string
): Promise<string> {
    if (explicit !== undefined) return explicit
    if (ctx.defaultSynchronizerId !== undefined)
        return ctx.defaultSynchronizerId

    const synchronizers = await connectedSynchronizers(ctx)
    if (synchronizers.length > 1) {
        ctx.error.throw({
            type: 'BadRequest',
            message:
                'No synchronizerId was given and the participant is connected to several ' +
                `synchronizers (${idsOf(synchronizers)}). Pass synchronizerId to this ` +
                'call, or to SDK.create.',
        })
    }

    // memoised on the context so later calls do not query the ledger again
    ctx.defaultSynchronizerId = synchronizers[0].synchronizerId
    return ctx.defaultSynchronizerId
}

/**
 * Resolves the synchronizer an SDK instance defaults to. A plain id is taken as-is;
 * a selector needs to see the connected synchronizers, so it queries the ledger.
 * Undefined means nothing was chosen — the synchronizer is then worked out on first
 * use, so creating an SDK costs no ledger round-trip.
 */
export async function resolveSdkSynchronizerId(
    ledgerProvider: AbstractLedgerProvider,
    option: SynchronizerIdOption | undefined,
    error: SDKErrorHandler
): Promise<string | undefined> {
    if (option === undefined || typeof option === 'string') return option

    const synchronizers = await connectedSynchronizers({
        ledgerProvider,
        error,
    })
    const selected = option(synchronizers)
    if (!synchronizers.some((s) => s.synchronizerId === selected)) {
        error.throw({
            type: 'BadRequest',
            message: `Selected synchronizer "${selected}" is not connected. Connected: ${idsOf(synchronizers)}.`,
        })
    }
    return selected
}

async function connectedSynchronizers(
    ctx: Pick<SDKContext, 'ledgerProvider' | 'error'>
): Promise<ConnectedSynchronizer[]> {
    const response =
        await ctx.ledgerProvider.request<Ops.GetV2StateConnectedSynchronizers>({
            method: 'ledgerApi',
            params: {
                resource: '/v2/state/connected-synchronizers',
                requestMethod: 'get',
                query: {},
            },
        })

    const synchronizers = response.connectedSynchronizers ?? []
    if (synchronizers.length === 0) {
        ctx.error.throw({
            message: 'No connected synchronizers found',
            type: 'NotFound',
        })
    }
    return synchronizers
}

function idsOf(synchronizers: readonly ConnectedSynchronizer[]) {
    return synchronizers.map((s) => s.synchronizerId).join(', ')
}
