// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Provider } from '@canton-network/core-splice-provider'
import { DappSyncProvider } from '@canton-network/core-provider-dapp'
import type { RpcTypes as DappRpcTypes } from '@canton-network/core-wallet-dapp-rpc-client'
import { WalletEvent } from '@canton-network/core-types'
import { WindowTransport } from '@canton-network/core-rpc-transport'
import type {
    ProviderAdapter,
    WalletInfo,
} from '@canton-network/core-wallet-discovery'
import type {
    ProviderId,
    ProviderType,
} from '@canton-network/core-wallet-dapp-rpc-client'
import * as storage from '../storage'

const BROWSER_PROVIDER_ID: ProviderId = 'browser'
const EXTENSION_DETECT_TIMEOUT_MS = 2000

export type ExtensionAdapterConfig = {
    providerId?: ProviderId | undefined
    name?: string | undefined
    icon?: string | undefined
    description?: string | undefined
    /** Optional routing key used for postMessage targeting. */
    target?: string | undefined
}

/**
 * ProviderAdapter for any CIP-103 compliant wallet exposed as a browser extension.
 *
 * provider() returns a DappProvider which communicates via postMessage
 * and implements the full openrpc-dapp-api.json surface directly.
 */
export class ExtensionAdapter implements ProviderAdapter {
    readonly providerId: ProviderId
    readonly name: string
    readonly type: ProviderType = 'browser'
    readonly icon: string | undefined
    private readonly description: string
    readonly target?: string | undefined

    constructor(config: ExtensionAdapterConfig = {}) {
        this.providerId = config.providerId ?? BROWSER_PROVIDER_ID
        this.name = config.name ?? 'Browser Extension'
        this.icon = config.icon
        this.description =
            config.description ??
            'Connect via the Splice Wallet browser extension'
        this.target = config.target
    }

    getInfo(): WalletInfo {
        return {
            providerId: this.providerId,
            name: this.name,
            type: this.type,
            description: this.description,
            icon: this.icon,
        }
    }

    async detect(): Promise<boolean> {
        if (window.canton) return true

        return new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => {
                window.removeEventListener('message', handler)
                resolve(false)
            }, EXTENSION_DETECT_TIMEOUT_MS)

            const handler = (event: MessageEvent) => {
                if (
                    event.data?.type === WalletEvent.SPLICE_WALLET_EXT_ACK &&
                    (!this.target || event.data?.target === this.target)
                ) {
                    clearTimeout(timeout)
                    window.removeEventListener('message', handler)
                    resolve(true)
                }
            }

            window.addEventListener('message', handler)
            window.postMessage(
                {
                    type: WalletEvent.SPLICE_WALLET_EXT_READY,
                    target: this.target,
                },
                '*'
            )
        })
    }

    provider(): Provider<DappRpcTypes> {
        if (this.target) {
            return new DappSyncProvider(
                new WindowTransport(window, { target: this.target })
            ) as Provider<DappRpcTypes>
        }
        return new DappSyncProvider() as Provider<DappRpcTypes>
    }

    teardown(): void {
        // No cleanup needed for extensions
    }

    async restore(): Promise<Provider<DappRpcTypes> | null> {
        const kernel = storage.getKernelDiscovery()
        const kernelMatches =
            kernel?.walletType === 'extension' &&
            (kernel.providerId === undefined ||
                kernel.providerId === (this.providerId as string))

        const provider = this.provider()
        if (kernelMatches) {
            try {
                await provider.request({ method: 'connect' })
            } catch {
                // best-effort
            }
        }
        try {
            const status = await provider.request({ method: 'status' })
            if (status.connection.isConnected) {
                return provider as Provider<DappRpcTypes>
            }
        } catch {
            if (kernelMatches) {
                return provider as Provider<DappRpcTypes>
            }
        }
        return null
    }
}
