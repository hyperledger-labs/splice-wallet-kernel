// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { RequestPayload } from '@canton-network/core-types'
import { WindowTransport } from '@canton-network/core-rpc-transport'
import SpliceWalletJSONRPCDAppAPI from '@canton-network/core-wallet-dapp-rpc-client'
import { SpliceProviderBase } from './SpliceProvider.js'

// TODO: remove this in favor of DappProvider
export class SpliceProviderWindow extends SpliceProviderBase {
    private client: SpliceWalletJSONRPCDAppAPI

    constructor() {
        super()
        const transport = new WindowTransport(window)
        this.client = new SpliceWalletJSONRPCDAppAPI(transport)
    }

    public async request<T>({ method, params }: RequestPayload): Promise<T> {
        return (await (
            this.client.request as (
                method: string,
                params?: RequestPayload['params']
            ) => Promise<unknown>
        )(method, params)) as T
    }
}
