// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import SpliceWalletJSONRPCDAppAPI, {
    RpcTypes as DappRpcTypes,
} from '@canton-network/core-wallet-dapp-rpc-client'
import { AbstractProviderV2 } from './SpliceProvider'
import { RequestArgsV2 } from '@canton-network/core-types'
import {
    RpcTransport,
    WindowTransport,
} from '@canton-network/core-rpc-transport'

export class DappProvider extends AbstractProviderV2<DappRpcTypes> {
    private client: SpliceWalletJSONRPCDAppAPI

    constructor(transport?: RpcTransport) {
        super()
        this.client = new SpliceWalletJSONRPCDAppAPI(
            transport ?? new WindowTransport(window)
        )
    }

    public async request<M extends keyof DappRpcTypes>(
        args: RequestArgsV2<DappRpcTypes, M>
    ): Promise<DappRpcTypes[M]['result']> {
        return await this.client.requestV2<M>(args)
    }
}
