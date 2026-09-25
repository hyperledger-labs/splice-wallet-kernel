// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { v4 } from 'uuid'
import type { SDKContext } from '../../init/types/context.js'
import type { SDKLogger } from '../../logger/logger.js'
import type { TopUpTrafficParams, TrafficAccount } from './types.js'

type TrafficOperation = { params: unknown; result: unknown }

type GetTrafficAccount = {
    params: {
        resource: '/v2/traffic/accounts/{account-id}'
        requestMethod: 'get'
        path: { 'account-id': string }
    }
    result: TrafficAccount
}

type UpdateTrafficAccount = {
    params: {
        resource: '/v2/traffic/accounts'
        requestMethod: 'post'
        body: {
            accountId: string
            balanceDelta: number
            deduplicationId: string
        }
    }
    result: { response: TrafficAccount }
}

/**
 * The vendored Ledger API spec carries no `/v2/traffic/*` paths, so the
 * provider's generated operation union does not cover them and this namespace
 * has to describe them itself. Only the types are local -- the requests go
 * through the same provider, auth and retries as every other Ledger API call.
 */
type TrafficLedgerProvider = {
    request<O extends TrafficOperation>(args: {
        method: 'ledgerApi'
        params: O['params']
    }): Promise<O['result']>
}

/**
 * Traffic accounting on a Canton participant.
 *
 * The endpoints behind this are only served when the participant runs with
 * `traffic-enforcement.enabled = true`; against one that does not, they answer
 * 404.
 */
export class TrafficAccountNamespace {
    private readonly logger: SDKLogger

    constructor(private readonly ctx: SDKContext) {
        this.logger = ctx.logger.child({ namespace: 'TrafficAccountNamespace' })
    }

    /**
     * Current traffic balance of an account.
     *
     * Needs `ActAs` or `ExecuteAs` rights on the party the account id names.
     */
    public async getTraffic(accountId: string): Promise<TrafficAccount> {
        this.logger.debug({ accountId }, 'Fetching traffic account')

        return this.ledgerProvider.request<GetTrafficAccount>({
            method: 'ledgerApi',
            params: {
                resource: '/v2/traffic/accounts/{account-id}',
                requestMethod: 'get',
                path: { 'account-id': accountId },
            },
        })
    }

    /**
     * Applies a balance delta to an account, and reports the state it came to.
     *
     * Admin-only, and off-ledger: this moves the participant's own accounting,
     * so nothing about it is recorded on the ledger.
     */
    public async topUpTraffic(
        params: TopUpTrafficParams
    ): Promise<TrafficAccount> {
        const { accountId, balanceDelta } = params
        const deduplicationId = params.deduplicationId ?? v4()

        this.logger.debug(
            { accountId, balanceDelta, deduplicationId },
            'Topping up traffic account'
        )

        const updated =
            await this.ledgerProvider.request<UpdateTrafficAccount>({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/traffic/accounts',
                    requestMethod: 'post',
                    body: { accountId, balanceDelta, deduplicationId },
                },
            })

        return updated.response
    }

    public async purchaseTraffic(): Promise<never> {
        this.ctx.error.throw({
            message: 'traffic.purchaseTraffic is not implemented yet',
            type: 'SDKOperationUnsupported',
        })
    }

    public async setup(): Promise<never> {
        this.ctx.error.throw({
            message: 'traffic.setup is not implemented yet',
            type: 'SDKOperationUnsupported',
        })
    }

    private get ledgerProvider(): TrafficLedgerProvider {
        return this.ctx.ledgerProvider as unknown as TrafficLedgerProvider
    }
}
