// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { GatewaysConfig } from '@canton-network/core-types'
import {
    DiscoveryClient,
    type ProviderAdapter,
    type WalletPickerFn,
} from '@canton-network/core-wallet-discovery'
import { pickWallet } from '@canton-network/core-wallet-ui-components'
import { ExtensionAdapter } from './adapter/extension-adapter'
import { GatewayAdapter } from './adapter/gateway-adapter'
import gateways from './gateways.json'

export interface DappClientConfig {
    appName: string
    defaultGateways?: GatewaysConfig[] | undefined
    additionalGateways?: GatewaysConfig[] | undefined
    adapters?: ProviderAdapter[] | undefined
    walletPicker?: WalletPickerFn | undefined
    /** Set to false to skip auto-detection of extension + default gateways. Defaults to true. */
    autoDetect?: boolean | undefined
}

/**
 * DappClient is a Canton-specific wrapper around DiscoveryClient.
 * It auto-detects the browser extension and default gateways,
 * and uses the built-in wallet picker UI by default.
 */
export class DappClient extends DiscoveryClient {
    private appConfig: DappClientConfig

    constructor(config: DappClientConfig) {
        super({
            walletPicker: config.walletPicker ?? pickWallet,
        })
        this.appConfig = config
    }

    async init(): Promise<void> {
        // Register explicitly supplied adapters
        if (this.appConfig.adapters) {
            for (const adapter of this.appConfig.adapters) {
                this.registerAdapter(adapter)
            }
        }

        // Auto-detect built-in adapters
        if (this.appConfig.autoDetect !== false) {
            await this.detectBuiltinAdapters()
        }

        // Restore previous session (handled by parent)
        await super.init()
    }

    private async detectBuiltinAdapters(): Promise<void> {
        const ext = new ExtensionAdapter()
        const extensionAvailable = await ext.detect()
        if (extensionAvailable) {
            this.registerAdapter(ext)
        }

        const allGateways = [
            ...(this.appConfig.defaultGateways ?? gateways),
            ...(this.appConfig.additionalGateways ?? []),
        ]
        for (const gw of allGateways) {
            const adapter = new GatewayAdapter({
                name: gw.name,
                rpcUrl: gw.rpcUrl,
            })
            this.registerAdapter(adapter)
        }
    }
}

export function createDappClient(config: DappClientConfig): DappClient {
    return new DappClient(config)
}

// Re-export ActiveSession from core
export type { ActiveSession } from '@canton-network/core-wallet-discovery'
