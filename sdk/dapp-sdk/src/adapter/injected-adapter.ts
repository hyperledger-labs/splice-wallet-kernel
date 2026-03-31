// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Provider } from '@canton-network/core-splice-provider'
import type { RpcTypes as DappRpcTypes } from '@canton-network/core-wallet-dapp-rpc-client'
import type {
    ProviderAdapter,
    WalletInfo,
} from '@canton-network/core-wallet-discovery'
import type {
    ProviderId,
    ProviderType,
} from '@canton-network/core-wallet-dapp-rpc-client'

export type InjectedAdapterConfig = {
    id: string
    name: string
    provider: Provider<DappRpcTypes>
    icon?: string | undefined
    description?: string | undefined
}

export class InjectedAdapter implements ProviderAdapter {
    readonly providerId: ProviderId
    readonly name: string
    readonly type: ProviderType = 'browser'
    readonly icon: string | undefined

    private providerInstance: Provider<DappRpcTypes>
    private description?: string | undefined

    constructor(config: InjectedAdapterConfig) {
        this.providerId = `browser:${config.id}` as ProviderId
        this.name = config.name
        this.icon = config.icon
        this.providerInstance = config.provider
        this.description = config.description
    }

    getInfo(): WalletInfo {
        return {
            providerId: this.providerId,
            name: this.name,
            type: this.type,
            description:
                this.description ??
                'Connect via an injected CIP-103 provider (window namespace)',
            icon: this.icon,
        }
    }

    async detect(): Promise<boolean> {
        return true
    }

    provider(): Provider<DappRpcTypes> {
        return this.providerInstance
    }

    teardown(): void {
        // No cleanup needed; the provider lifecycle is owned by the wallet.
    }

    async restore(): Promise<Provider<DappRpcTypes> | null> {
        try {
            const status = await this.providerInstance.request({
                method: 'status',
            })
            if (status.connection.isConnected) {
                return this.providerInstance
            }
        } catch {
            // best-effort
        }
        return null
    }
}
