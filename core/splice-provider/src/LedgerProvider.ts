// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AbstractProvider } from './provider'
import { RequestArgs } from '@canton-network/core-types'
import { LedgerTypes } from '@canton-network/core-ledger-client-types'

export class LedgerProvider extends AbstractProvider<LedgerTypes> {
    constructor() {
        super()
    }

    /**
     *
     * Example usage:
     *
     * const provider = new LedgerProvider(...)
     *
     * // Caveat: TypeScript can infer the correct params body based on the method + API path, but the result will be typed as `unknown` without a type argument:
     *
     * const result1 = await provider.request({ method: 'ledgerApi', params: { ... } });
     * //    ^ type = `unknown`
     *
     *
     * // Specify an operation type to get correctly typed result:
     *
     * const result2 = await provider.request<PostV2Parties>({ method: 'ledgerApi', params: { ... } });
     * //    ^ type = `PostV2Parties['ledgerApi']['result']`
     *
     * @param args
     * @returns
     */
    public async request<L extends LedgerTypes>(
        args: RequestArgs<L, 'ledgerApi'>
    ): Promise<L['ledgerApi']['result']> {
        // TODO: Implement LedgerProvider
        console.log('Received request:', args)
        return Promise.resolve({}) as LedgerTypes['ledgerApi']['result']
    }
}
