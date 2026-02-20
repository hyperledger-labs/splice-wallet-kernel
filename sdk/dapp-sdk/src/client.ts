// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    WalletEvent,
    type GatewaysConfig,
    type SpliceMessage,
} from '@canton-network/core-types'
import {
    injectProvider,
    type EventListener,
} from '@canton-network/core-splice-provider'
import type {
    StatusEvent,
    PrepareExecuteParams,
    PrepareExecuteAndWaitResult,
    LedgerApiParams,
    LedgerApiResult,
    ListAccountsResult,
    AccountsChangedEvent,
    TxChangedEvent,
    RpcTypes as DappRpcTypes,
} from '@canton-network/core-wallet-dapp-rpc-client'
import {
    DiscoveryClient,
    toWalletId,
    type ProviderAdapter,
    type WalletId,
    type WalletPickerFn,
    type WalletPickerEntry,
} from '@canton-network/core-wallet-discovery'
import { pickWallet, popup } from '@canton-network/core-wallet-ui-components'
import type { Provider } from '@canton-network/core-splice-provider'
import { ExtensionAdapter } from './adapter/extension-adapter'
import { GatewayAdapter } from './adapter/gateway-adapter'
import * as storage from './storage'
import { clearAllLocalState } from './util'
import gateways from './gateways.json'

export interface DappClientConfig {
    appName: string
    /**
     * Provide an already-obtained provider directly.
     * When set, wallet discovery and the picker are skipped entirely —
     * the client simply wraps this provider with convenience methods.
     */
    provider?: Provider<DappRpcTypes> | undefined
    /** Pre-configured gateways. Defaults to the built-in list when `autoDetect` is true. */
    defaultGateways?: GatewaysConfig[] | undefined
    /** Additional gateways appended to the defaults. */
    additionalGateways?: GatewaysConfig[] | undefined
    /** Extra adapters registered on init. */
    adapters?: ProviderAdapter[] | undefined
    /** Custom wallet picker UI. Defaults to the built-in popup. */
    walletPicker?: WalletPickerFn | undefined
    /** Set to false to skip auto-detection of extension + default gateways. Defaults to true. */
    autoDetect?: boolean | undefined
}

/**
 * DappClient is the main entry point for Canton dApps.
 *
 * It can operate in two modes:
 *
 * **Direct provider** — when `config.provider` is given the client wraps it
 * immediately. No wallet discovery or picker UI is involved.
 *
 * **Discovery** — when no provider is given the client auto-detects browser
 * extensions and configured gateways. Calling `connect()` opens the wallet
 * picker to obtain a provider.
 *
 * In both modes the client exposes the same convenience methods for RPC
 * calls, event subscriptions, and `window.canton` injection.
 */
export class DappClient extends DiscoveryClient {
    private appConfig: DappClientConfig
    private dynamicAdapterIds = new Set<string>()
    private directProvider: Provider<DappRpcTypes> | null = null

    constructor(config: DappClientConfig) {
        super({
            walletPicker: config.walletPicker ?? pickWallet,
        })
        this.appConfig = config
    }

    // ── Lifecycle ─────────────────────────────────────────

    async init(): Promise<void> {
        // Direct-provider mode: skip adapter detection & session restore.
        if (this.appConfig.provider) {
            this.directProvider = this.appConfig.provider
            injectProvider(this.directProvider)
            this.setupSessionListeners(this.directProvider)
            return
        }

        if (this.appConfig.adapters) {
            for (const adapter of this.appConfig.adapters) {
                this.registerAdapter(adapter)
            }
        }

        if (this.appConfig.autoDetect !== false) {
            await this.detectBuiltinAdapters()
        }

        await super.init()

        const session = this.getActiveSession()
        if (session) {
            injectProvider(session.provider)
            this.setupSessionListeners(session.provider)
        }
    }

    /**
     * Connect to a wallet.
     *
     * In direct-provider mode this is a no-op (the provider was given at
     * construction time).
     *
     * In discovery mode the wallet picker is shown (unless `walletId` is
     * provided). When the picker returns a custom gateway URL that has no
     * registered adapter, a GatewayAdapter is created on the fly.
     */
    async connect(walletId?: WalletId | undefined): Promise<void> {
        if (this.directProvider) return

        clearAllLocalState()

        let targetId = walletId

        if (!targetId) {
            const walletPicker = this.appConfig.walletPicker ?? pickWallet

            // Only show builtin adapters in the picker; dynamically
            // registered adapters are surfaced via the "Recently Used"
            // section that the picker reads from localStorage.
            const entries: WalletPickerEntry[] = this.listAdapters()
                .filter(
                    (a) => !this.dynamicAdapterIds.has(a.walletId as string)
                )
                .map((a) => {
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

            const picked = await walletPicker(entries)
            targetId = toWalletId(picked.walletId)

            if (picked.type === 'gateway' && picked.url) {
                const existing = this.listAdapters().find(
                    (a) => a.walletId === targetId
                )
                if (!existing) {
                    const adapter = new GatewayAdapter({
                        name: picked.name,
                        rpcUrl: picked.url,
                    })
                    this.registerAdapter(adapter)
                    this.dynamicAdapterIds.add(adapter.walletId as string)
                    targetId = adapter.walletId
                }
            }
        }

        await super.connect(targetId)

        const session = this.getActiveSession()
        if (!session) return

        const { adapter, provider } = session

        const info = adapter.getInfo()
        if (info.type === 'gateway' && info.url) {
            storage.setKernelDiscovery({
                walletType: 'remote',
                url: info.url,
            })
            this.saveRecentGateway(info.name, info.url)
        } else if (info.type === 'extension') {
            storage.setKernelDiscovery({ walletType: 'extension' })
        }

        injectProvider(provider)
        this.setupSessionListeners(provider)
    }

    async disconnect(): Promise<void> {
        if (this.directProvider) {
            try {
                await this.directProvider.request({ method: 'disconnect' })
            } finally {
                this.directProvider = null
                clearAllLocalState({ closePopup: true })
            }
            return
        }

        try {
            await super.disconnect()
        } finally {
            clearAllLocalState({ closePopup: true })
        }
    }

    // ── Provider access ───────────────────────────────────

    override getProvider(): Provider<DappRpcTypes> {
        if (this.directProvider) return this.directProvider
        return super.getProvider()
    }

    // ── RPC convenience methods ────────────────────────────

    async status(): Promise<StatusEvent> {
        return this.getProvider().request({ method: 'status' })
    }

    async listAccounts(): Promise<ListAccountsResult> {
        return this.getProvider().request({ method: 'listAccounts' })
    }

    async prepareExecute(params: PrepareExecuteParams): Promise<null> {
        return this.getProvider().request({
            method: 'prepareExecute',
            params,
        })
    }

    async prepareExecuteAndWait(
        params: PrepareExecuteParams
    ): Promise<PrepareExecuteAndWaitResult> {
        return this.getProvider().request({
            method: 'prepareExecuteAndWait',
            params,
        })
    }

    async ledgerApi(params: LedgerApiParams): Promise<LedgerApiResult> {
        return this.getProvider().request({ method: 'ledgerApi', params })
    }

    // ── Event convenience methods ──────────────────────────

    onStatusChanged(listener: EventListener<StatusEvent>): void {
        this.getProvider().on<StatusEvent>('statusChanged', listener)
    }

    onAccountsChanged(listener: EventListener<AccountsChangedEvent>): void {
        this.getProvider().on<AccountsChangedEvent>('accountsChanged', listener)
    }

    onTxChanged(listener: EventListener<TxChangedEvent>): void {
        this.getProvider().on<TxChangedEvent>('txChanged', listener)
    }

    removeOnStatusChanged(listener: EventListener<StatusEvent>): void {
        this.getProvider().removeListener<StatusEvent>(
            'statusChanged',
            listener
        )
    }

    removeOnAccountsChanged(
        listener: EventListener<AccountsChangedEvent>
    ): void {
        this.getProvider().removeListener<AccountsChangedEvent>(
            'accountsChanged',
            listener
        )
    }

    removeOnTxChanged(listener: EventListener<TxChangedEvent>): void {
        this.getProvider().removeListener<TxChangedEvent>('txChanged', listener)
    }

    // ── Open wallet UI ─────────────────────────────────────

    async open(): Promise<void> {
        const statusResult = await this.status()
        const userUrl = statusResult.provider.userUrl
        if (!userUrl) throw new Error('User URL not found in session')

        if (this.directProvider) {
            popup.open(userUrl)
            return
        }

        const session = this.getActiveSession()
        if (!session) throw new Error('No active session')

        const info = session.adapter.getInfo()
        if (info.type === 'gateway') {
            popup.open(userUrl)
        } else if (info.type === 'extension') {
            window.postMessage(
                {
                    type: WalletEvent.SPLICE_WALLET_EXT_OPEN,
                    url: userUrl,
                } as SpliceMessage,
                '*'
            )
        }
    }

    // ── Private helpers ────────────────────────────────────

    private setupSessionListeners(provider: Provider<DappRpcTypes>): void {
        provider.on<StatusEvent>('statusChanged', (event) => {
            if (event.connection.isConnected && event.session) {
                storage.setKernelSession(event)
            }
        })

        provider.on<StatusEvent>('statusChanged', (event) => {
            if (!event.connection.isConnected) {
                clearAllLocalState({ closePopup: true })
            }
        })

        window.addEventListener('message', (event: MessageEvent) => {
            if (event.data?.type === WalletEvent.SPLICE_WALLET_LOGOUT) {
                clearAllLocalState({ closePopup: true })
            }
        })
    }

    private static RECENT_GATEWAYS_KEY = 'splice_wallet_picker_recent'

    private saveRecentGateway(name: string, rpcUrl: string): void {
        try {
            const raw = localStorage.getItem(DappClient.RECENT_GATEWAYS_KEY)
            const recent: { name: string; rpcUrl: string }[] = raw
                ? JSON.parse(raw)
                : []
            const filtered = recent.filter((r) => r.rpcUrl !== rpcUrl)
            filtered.unshift({ name, rpcUrl })
            localStorage.setItem(
                DappClient.RECENT_GATEWAYS_KEY,
                JSON.stringify(filtered.slice(0, 5))
            )
        } catch {
            // best-effort
        }
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
