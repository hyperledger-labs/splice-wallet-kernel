// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Provider } from '@canton-network/core-splice-provider'
import type { RpcTypes as DappRpcTypes } from '@canton-network/core-wallet-dapp-rpc-client'
import type {
    ProviderAdapter,
    WalletInfo,
    WalletId,
    WalletPickerFn,
} from './types'
import { toWalletId } from './types'
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

export interface DiscoveryClientConfig {
    /** Adapters to register on init. */
    adapters?: ProviderAdapter[] | undefined
    /**
     * A function that presents wallet choices to the user and returns their selection.
     * When not provided, `connect()` requires a `walletId` argument.
     */
    walletPicker?: WalletPickerFn | undefined
}

export interface ActiveSession {
    walletId: WalletId
    adapter: ProviderAdapter
    provider: Provider<DappRpcTypes>
}

const STORAGE_KEY = 'canton_discovery_client_session'

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
    private adapters = new Map<WalletId, ProviderAdapter>()
    private events = new EventEmitter()
    private session: ActiveSession | null = null
    private config: DiscoveryClientConfig

    constructor(config: DiscoveryClientConfig) {
        this.config = config
    }

    /**
     * Initialize the client: register configured adapters and
     * attempt to restore a previous session.
     */
    async init(): Promise<void> {
        if (this.config.adapters) {
            for (const adapter of this.config.adapters) {
                this.adapters.set(adapter.walletId, adapter)
            }
        }

        await this.tryRestore()
    }

    private async tryRestore(): Promise<void> {
        const persisted = loadPersistedSession()
        if (!persisted) return

        const adapter = this.adapters.get(persisted.walletId)
        if (!adapter?.restore) return

        try {
            const provider = await adapter.restore()
            if (provider) {
                this.session = {
                    walletId: adapter.walletId,
                    adapter,
                    provider,
                }
                this.events.emit('discovery:connected', {
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

    listAdapters(): ProviderAdapter[] {
        return Array.from(this.adapters.values())
    }

    async listWallets(): Promise<WalletInfo[]> {
        return this.listAdapters().map((a) => a.getInfo())
    }

    // ── Connection lifecycle ───────────────────────────────

    /**
     * Connect to a wallet.
     * - If `walletId` is provided, connects directly to that wallet.
     * - If omitted and a `walletPicker` was configured, opens the picker.
     * - If omitted and no picker is configured, throws.
     */
    async connect(walletId?: WalletId | undefined): Promise<void> {
        let targetId = walletId

        if (!targetId) {
            if (!this.config.walletPicker) {
                throw new DiscoveryError(
                    'INTERNAL_ERROR',
                    'No walletId provided and no walletPicker configured'
                )
            }

            const entries = this.listAdapters().map((a) => {
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

            const picked = await this.config.walletPicker(entries)
            targetId = toWalletId(picked.walletId)
        }

        const adapter = this.adapters.get(targetId)
        if (!adapter) throw new WalletNotFoundError(targetId)

        try {
            const provider = adapter.createProvider()
            await provider.request({ method: 'connect' })
            this.session = { walletId: targetId, adapter, provider }
            persistSession(targetId)
            this.events.emit('discovery:connected', { walletId: targetId })
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

        const { walletId, adapter, provider } = this.session
        try {
            await provider.request({ method: 'disconnect' })
        } finally {
            adapter.teardown()
            this.session = null
            clearPersistedSession()
            this.events.emit('discovery:disconnected', { walletId })
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

    off<K extends DiscoveryClientEventName>(
        event: K,
        handler: DiscoveryClientEventHandler<K>
    ): void {
        this.events.off(event, handler)
    }

    destroy(): void {
        this.events.removeAllListeners()
        this.session = null
    }
}
