// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Provider } from '@canton-network/core-splice-provider'
import type {
    ProviderId,
    RpcTypes as DappRpcTypes,
} from '@canton-network/core-wallet-dapp-rpc-client'
import type { ProviderAdapter, WalletInfo, WalletPickerFn } from './types'
import {
    EventEmitter,
    type DiscoveryClientEventName,
    type DiscoveryClientEventHandler,
} from './events'
import {
    WalletNotFoundError,
    NotConnectedError,
    DiscoveryError,
} from './errors'
import {
    loadPersistedSession,
    persistSession,
    clearPersistedSession,
} from './storage'

export interface DiscoveryClientConfig {
    /** Adapters to register on init. */
    adapters?: ProviderAdapter[] | undefined
    /**
     * A function that presents wallet choices to the user and returns their selection.
     * When not provided, `connect()` requires a `providerId` argument.
     */
    walletPicker?: WalletPickerFn | undefined
}

export interface ActiveSession {
    providerId: ProviderId
    adapter: ProviderAdapter
    provider: Provider<DappRpcTypes>
}

/**
 * DiscoveryClient manages provider adapters and exposes a unified
 * Provider<DappRpcTypes> regardless of the underlying wallet type.
 *
 * It is UI-framework agnostic — the wallet picker UI is injected
 * via the `walletPicker` config option.
 *
 * Client-level events (`discovery:connected`, `discovery:disconnected`,
 * `discovery:error`) track the adapter session lifecycle. Provider-level
 * CIP-103 events (statusChanged, accountsChanged, txChanged) live on
 * the Provider — subscribe via `client.getProvider().on(...)`.
 */
export class DiscoveryClient {
    private adapters = new Map<ProviderId, ProviderAdapter>()
    private events = new EventEmitter()
    private session: ActiveSession | null = null
    private config: DiscoveryClientConfig

    private constructor(config: DiscoveryClientConfig) {
        this.config = config
    }

    /**
     * Create and initialize a DiscoveryClient:
     * register configured adapters and attempt session restore.
     */
    static async create(
        config: DiscoveryClientConfig
    ): Promise<DiscoveryClient> {
        const client = new DiscoveryClient(config)
        await client.initialize()
        return client
    }

    private async initialize(): Promise<void> {
        if (this.config.adapters) {
            for (const adapter of this.config.adapters) {
                this.adapters.set(adapter.providerId, adapter)
            }
        }

        await this.tryRestore()
    }

    private async tryRestore(): Promise<void> {
        const persisted = loadPersistedSession()
        if (!persisted) return

        const adapter = this.adapters.get(persisted.providerId)
        if (!adapter?.restore) return

        try {
            const provider = await adapter.restore()
            if (provider) {
                this.session = {
                    providerId: adapter.providerId,
                    adapter,
                    provider,
                }
                this.events.emit('discovery:connected', {
                    providerId: adapter.providerId,
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
        this.adapters.set(adapter.providerId, adapter)
    }

    listAdapters(): ProviderAdapter[] {
        return Array.from(this.adapters.values())
    }

    listWallets(): WalletInfo[] {
        return this.listAdapters().map((a) => a.getInfo())
    }

    // ── Connection lifecycle ───────────────────────────────

    /**
     * Connect to a wallet.
     * - If `providerId` is provided, connects directly to that wallet.
     * - If omitted and a `walletPicker` was configured, opens the picker.
     * - If omitted and no picker is configured, throws.
     */
    async connect(providerId?: ProviderId | undefined): Promise<void> {
        let targetId = providerId

        if (!targetId) {
            if (!this.config.walletPicker) {
                throw new DiscoveryError(
                    'INTERNAL_ERROR',
                    'No providerId provided and no walletPicker configured'
                )
            }

            const entries = this.listAdapters().map((a) => {
                const info = a.getInfo()
                return {
                    providerId: info.providerId as string,
                    name: info.name,
                    type: info.type,
                    description: info.description,
                    icon: info.icon,
                    url: info.url,
                }
            })

            const picked = await this.config.walletPicker(entries)
            targetId = picked.providerId
        }

        if (!targetId) {
            throw new DiscoveryError(
                'INTERNAL_ERROR',
                'No providerId selected from wallet picker'
            )
        }

        const adapter = this.adapters.get(targetId)
        if (!adapter) throw new WalletNotFoundError(targetId)

        try {
            const provider = adapter.provider()
            await provider.request({ method: 'connect' })
            this.session = { providerId: targetId, adapter, provider }
            persistSession(targetId)
            this.events.emit('discovery:connected', { providerId: targetId })
        } catch (err) {
            this.events.emit('discovery:error', {
                code:
                    err instanceof DiscoveryError ? err.code : 'INTERNAL_ERROR',
                message:
                    err instanceof Error ? err.message : 'Connection failed',
                cause: err,
            })
            throw err
        }
    }

    async disconnect(): Promise<void> {
        if (!this.session) return

        const { providerId, adapter, provider } = this.session
        try {
            await provider.request({ method: 'disconnect' })
        } finally {
            adapter.teardown()
            this.session = null
            clearPersistedSession()
            this.events.emit('discovery:disconnected', { providerId })
        }
    }

    getActiveSession(): ActiveSession | null {
        return this.session
    }

    // ── Provider access ────────────────────────────────────

    getProvider(): Provider<DappRpcTypes> {
        if (!this.session) throw new NotConnectedError()
        return this.session.provider
    }

    // ── Events ─────────────────────────────────────────────

    on<K extends DiscoveryClientEventName>(
        event: K,
        handler: DiscoveryClientEventHandler<K>
    ): () => void {
        return this.events.on(event, handler)
    }

    removeListener<K extends DiscoveryClientEventName>(
        event: K,
        handler: DiscoveryClientEventHandler<K>
    ): void {
        this.events.removeListener(event, handler)
    }

    destroy(): void {
        this.events.removeAllListeners()
        this.session = null
    }
}
