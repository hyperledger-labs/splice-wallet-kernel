// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// import { RequestPayload } from '@canton-network/core-types'
// import { WindowTransport } from '@canton-network/core-rpc-transport'
import SpliceWalletJSONRPCDAppAPI from '@canton-network/core-wallet-dapp-rpc-client'
import { SpliceProviderBase } from './SpliceProvider.js'

export class SpliceProviderWindow extends SpliceProviderBase {
    // private client: SpliceWalletJSONRPCDAppAPI

    constructor(client: SpliceWalletJSONRPCDAppAPI) {
        super(client)
    }
}
