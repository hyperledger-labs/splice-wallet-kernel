// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Provider } from '@canton-network/core-splice-provider'
import type { RpcTypes as DappRpcTypes } from '@canton-network/core-wallet-dapp-rpc-client'
import { popup } from '@canton-network/core-wallet-ui-components'
import type { WalletAdapter, WalletInfo, WalletType, WalletId } from './types'
import { toWalletId } from './types'
import { DappSDKProvider } from '../sdk-provider'

export interface GatewayAdapterConfig {
    walletId?: string | undefined
    name: string
    rpcUrl: string
    icon?: string | undefined
    description?: string | undefined
}

/**
 * Adapter for a remote Wallet Gateway.
 *
 * createProvider() returns a DappSDKProvider which wraps DappAsyncProvider
 * (openrpc-dapp-remote-api.json) and bridges it to the dApp API surface
 * (openrpc-dapp-api.json) via dappSDKController. That bridge handles:
 *   - connect: remote connect → open popup → wait for statusChanged SSE
 *   - prepareExecute: remote prepareExecute → open popup → return null
 *   - prepareExecuteAndWait: prepareExecute → wait for txChanged SSE
 *   - event forwarding (statusChanged, txChanged, accountsChanged)
 */
export class GatewayAdapter implements WalletAdapter {
    readonly walletId: WalletId
    readonly name: string
    readonly type: WalletType = 'gateway'
    readonly icon: string | undefined
    readonly rpcUrl: string

    private description: string | undefined

    constructor(config: GatewayAdapterConfig) {
        this.walletId = toWalletId(
            config.walletId ?? `gateway:${config.rpcUrl}`
        )
        this.name = config.name
        this.rpcUrl = config.rpcUrl
        this.icon = config.icon
        this.description = config.description
    }

    getInfo(): WalletInfo {
        return {
            walletId: this.walletId,
            name: this.name,
            type: this.type,
            description: this.description,
            icon: this.icon,
            url: this.rpcUrl,
        }
    }

    async detect(): Promise<boolean> {
        return true
    }

    createProvider(): Provider<DappRpcTypes> {
        return new DappSDKProvider({
            walletType: 'remote',
            url: this.rpcUrl,
        })
    }

    teardown(): void {
        popup.close()
    }
}
