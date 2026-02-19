// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { GatewaysConfig } from '@canton-network/core-types'
import type { Provider } from '@canton-network/core-splice-provider'
import type { RpcTypes as DappRpcTypes } from '@canton-network/core-wallet-dapp-rpc-client'
import { pickWallet } from '@canton-network/core-wallet-ui-components'
import type { ProviderAdapter, WalletInfo, WalletId } from './adapter/types'
import { toWalletId } from './adapter/types'
import {
    EventEmitter,
    DappClientEventName,
    DappClientEventHandler,
} from './adapter/events'
import {
    WalletNotFoundError,
    NotConnectedError,
    DappError,
} from './adapter/errors'
import { ExtensionAdapter } from './adapter/extension-adapter'
import { GatewayAdapter } from './adapter/gateway-adapter'
import gateways from './gateways.json'

export interface DappClientConfig {
    appName: string
    defaultGateways?: GatewaysConfig[] | undefined
    additionalGateways?: GatewaysConfig[] | undefined
    adapters?: ProviderAdapter[] | undefined
    /** Set to false to skip auto-detection of extension + default gateways. Defaults to true. */
    autoDetect?: boolean | undefined
}

export interface ActiveSession {
    walletId: WalletId
    adapter: ProviderAdapter
    provider: Provider<DappRpcTypes>
}

const STORAGE_KEY = 'canton_dapp_client_session'

function persistSession(walletId: WalletId): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ walletId }))
    } catch {
        // Storage may be unavailable
    }
}

function loadPersistedSession(): { walletId: WalletId } | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) return JSON.parse(raw)
    } catch {
        // corrupt or unavailable
    }
    return null
}

function clearPersistedSession(): void {
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch {
        // ignore
    }
}

/**
 * The main DappClient manages wallet adapters and exposes a unified
 * Provider<DappRpcTypes> (openrpc-dapp-api.json) regardless of whether
 * the active wallet is an extension or a remote gateway.
 */
export class DappClient {
    private adapters = new Map<WalletId, ProviderAdapter>()
    private events = new EventEmitter()
    private session: ActiveSession | null = null
    private config: DappClientConfig
    private initialized = false

    constructor(config: DappClientConfig) {
        this.config = config
    }

    async init(): Promise<void> {
        if (this.initialized) return
        this.initialized = true

        // Register explicitly supplied adapters
        if (this.config.adapters) {
            for (const adapter of this.config.adapters) {
                this.adapters.set(adapter.walletId, adapter)
            }
        }

        // Auto-detect built-in adapters
        if (this.config.autoDetect !== false) {
            await this.detectBuiltinAdapters()
        }

        // Try restoring a previous session
        await this.tryRestore()
    }

    private async detectBuiltinAdapters(): Promise<void> {
        // Extension
        const ext = new ExtensionAdapter()
        const extensionAvailable = await ext.detect()
        if (extensionAvailable) {
            this.adapters.set(ext.walletId, ext)
        }

        // Gateways (from config + default gateways.json)
        const allGateways = [
            ...(this.config.defaultGateways ?? gateways),
            ...(this.config.additionalGateways ?? []),
        ]
        for (const gw of allGateways) {
            const adapter = new GatewayAdapter({
                name: gw.name,
                rpcUrl: gw.rpcUrl,
            })
            this.adapters.set(adapter.walletId, adapter)
        }
    }

    private async tryRestore(): Promise<void> {
        const persisted = loadPersistedSession()
        if (!persisted) return

        const adapter = this.adapters.get(persisted.walletId)
        if (!adapter?.restore) return

        try {
            const provider = await adapter.restore()
            if (provider) {
                this.session = { walletId: adapter.walletId, adapter, provider }
                this.events.emit('session:connected', {
                    walletId: adapter.walletId,
                })
            } else {
                clearPersistedSession()
            }
        } catch {
            clearPersistedSession()
        }
    }

    // ── Adapter management ─────────────────────────────────

    registerAdapter(adapter: ProviderAdapter): void {
        this.adapters.set(adapter.walletId, adapter)
    }

    async listWallets(): Promise<WalletInfo[]> {
        return Array.from(this.adapters.values()).map((a) => a.getInfo())
    }

    // ── Connection lifecycle ───────────────────────────────

    /**
     * Connect to a wallet.
     * - If `walletId` is provided, connects directly to that wallet.
     * - If omitted, opens the wallet picker popup and lets the user choose.
     */
    async connect(walletId?: WalletId | undefined): Promise<void> {
        let targetId = walletId

        if (!targetId) {
            // Open the wallet picker UI and let the user choose
            const entries = Array.from(this.adapters.values()).map((a) => {
                const info = a.getInfo()
                return {
                    walletId: info.walletId as string,
                    name: info.name,
                    type: info.type,
                    description: info.description,
                    icon: info.icon,
                    url: info.url,
                }
            })

            const picked = await pickWallet(entries)
            targetId = toWalletId(picked.walletId)
        }

        const adapter = this.adapters.get(targetId)
        if (!adapter) throw new WalletNotFoundError(targetId)

        try {
            const provider = adapter.createProvider()
            await provider.request({ method: 'connect' })
            this.session = { walletId: targetId, adapter, provider }
            persistSession(targetId)
            this.events.emit('session:connected', { walletId: targetId })
        } catch (err) {
            this.events.emit('error', {
                code: err instanceof DappError ? err.code : 'INTERNAL_ERROR',
                message:
                    err instanceof Error ? err.message : 'Connection failed',
                cause: err,
            })
            throw err
        }
    }

    async disconnect(): Promise<void> {
        if (!this.session) return

        const { walletId, adapter, provider } = this.session
        try {
            await provider.request({ method: 'disconnect' })
        } finally {
            adapter.teardown()
            this.session = null
            clearPersistedSession()
            this.events.emit('session:disconnected', { walletId })
        }
    }

    getActiveSession(): ActiveSession | null {
        return this.session
    }

    // ── Provider access (dApp API) ─────────────────────────

    getProvider(): Provider<DappRpcTypes> {
        if (!this.session) throw new NotConnectedError()
        return this.session.provider
    }

    // ── Events ─────────────────────────────────────────────

    on<K extends DappClientEventName>(
        event: K,
        handler: DappClientEventHandler<K>
    ): () => void {
        return this.events.on(event, handler)
    }

    off<K extends DappClientEventName>(
        event: K,
        handler: DappClientEventHandler<K>
    ): void {
        this.events.off(event, handler)
    }

    destroy(): void {
        this.events.removeAllListeners()
        this.session = null
    }
}

export function createDappClient(config: DappClientConfig): DappClient {
    return new DappClient(config)
}
