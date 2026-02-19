// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import SpliceWalletJSONRPCDAppAPI, {
    RpcTypes as DappRpcTypes,
} from '@canton-network/core-wallet-dapp-rpc-client'
import { AbstractProvider } from '@canton-network/core-splice-provider'
import { RequestArgs } from '@canton-network/core-types'
import {
    RpcTransport,
    WindowTransport,
} from '@canton-network/core-rpc-transport'

export class DappProvider extends AbstractProvider<DappRpcTypes> {
    private client: SpliceWalletJSONRPCDAppAPI

    constructor(transport?: RpcTransport) {
        super()
        this.client = new SpliceWalletJSONRPCDAppAPI(
            transport ?? new WindowTransport(window)
        )
    }

    public async request<M extends keyof DappRpcTypes>(
        args: RequestArgs<DappRpcTypes, M>
    ): Promise<DappRpcTypes[M]['result']> {
        return await this.client.request<M>(args)
    }
}
