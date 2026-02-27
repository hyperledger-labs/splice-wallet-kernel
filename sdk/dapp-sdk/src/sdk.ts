// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * DappSDK ties together DiscoveryClient + DappClient and serves as the
 * primary SDK entrypoint for dApp developers.
 *
 * A default singleton instance is exported at the bottom of this file, and
 * module-level functions delegate to that singleton for backward compatibility
 * (e.g. `sdk.connect()`, `sdk.status()`).
 */

import {
    DiscoveryClient,
    type ProviderAdapter,
    type WalletPickerEntry,
    type WalletPickerFn,
} from '@canton-network/core-wallet-discovery'
import { pickWallet } from '@canton-network/core-wallet-ui-components'
import type { EventListener } from '@canton-network/core-splice-provider'
import type { ProviderAdapterConfig } from '@canton-network/core-types'
import type {
    StatusEvent,
    ConnectResult,
    PrepareExecuteParams,
    PrepareExecuteAndWaitResult,
    LedgerApiParams,
    LedgerApiResult,
    ListAccountsResult,
    AccountsChangedEvent,
    TxChangedEvent,
} from '@canton-network/core-wallet-dapp-rpc-client'
import { DappClient } from './client'
import { ExtensionAdapter } from './adapter/extension-adapter'
import {
    RemoteAdapter,
    type RemoteAdapterConfig,
} from './adapter/remote-adapter'
import * as storage from './storage'
import { clearAllLocalState } from './util'
import defaultGatewayList from './gateways.json'

export interface DappSDKConnectOptions<
    TDefaultAdapter extends ProviderAdapter = ProviderAdapter,
> {
    defaultAdapters?: TDefaultAdapter[]
    additionalAdapters?: ProviderAdapter[] | undefined
}

export class DappSDK {
    private readonly RECENT_GATEWAYS_KEY = 'splice_wallet_picker_recent'
    private readonly walletPicker: WalletPickerFn
    private discovery: DiscoveryClient | null = null
    private client: DappClient | null = null
    private initPromise: Promise<void> | null = null
    private dynamicAdapterIds = new Set<string>()

    constructor(options?: { walletPicker?: WalletPickerFn | undefined }) {
        this.walletPicker =
            options?.walletPicker ?? (pickWallet as WalletPickerFn)
    }

    private async registerAdapters(
        discovery: DiscoveryClient,
        adapters?: ProviderAdapter[] | undefined
    ): Promise<void> {
        if (!adapters?.length) return

        const existingIds = new Set(
            discovery.listAdapters().map((a) => a.providerId as string)
        )
        for (const adapter of adapters) {
            const id = adapter.providerId as string
            if (existingIds.has(id)) continue
            if (await adapter.detect()) {
                discovery.registerAdapter(adapter)
                existingIds.add(id)
            }
        }
    }

    private async ensureDiscovery(
        config?: DappSDKConnectOptions
    ): Promise<DiscoveryClient> {
        if (this.discovery) {
            await this.registerAdapters(this.discovery, config?.defaultAdapters)
            await this.registerAdapters(
                this.discovery,
                config?.additionalAdapters
            )
            return this.discovery
        }

        const initialAdapters = await this.collectDetectedAdapters([
            ...(config?.defaultAdapters ?? []),
            ...(config?.additionalAdapters ?? []),
        ])

        this.discovery = await DiscoveryClient.create({
            walletPicker: this.walletPicker,
            adapters: initialAdapters,
        })

        // If a session was restored, create the DappClient immediately
        const session = this.discovery.getActiveSession()
        if (session) {
            const providerType = session.adapter.getInfo().type
            this.client = new DappClient(session.provider, { providerType })
        }

        return this.discovery
    }

    private async collectDetectedAdapters(
        adapters: ProviderAdapter[]
    ): Promise<ProviderAdapter[]> {
        const detected: ProviderAdapter[] = []
        for (const adapter of adapters) {
            if (await adapter.detect()) {
                detected.push(adapter)
            }
        }
        return detected
    }

    private async ensureInit(config?: DappSDKConnectOptions): Promise<void> {
        if (!this.initPromise) {
            this.initPromise = this.ensureDiscovery(config).then(
                () => undefined
            )
        }
        await this.initPromise
    }

    private saveRecentGateway(name: string, rpcUrl: string): void {
        try {
            const raw = localStorage.getItem(this.RECENT_GATEWAYS_KEY)
            const recent: { name: string; rpcUrl: string }[] = raw
                ? JSON.parse(raw)
                : []
            const filtered = recent.filter((r) => r.rpcUrl !== rpcUrl)
            filtered.unshift({ name, rpcUrl })
            localStorage.setItem(
                this.RECENT_GATEWAYS_KEY,
                JSON.stringify(filtered.slice(0, 5))
            )
        } catch {
            // best-effort
        }
    }

    private requireClient(): DappClient {
        if (!this.client)
            throw new Error('Not connected — call connect() first')
        return this.client
    }

    async connect(options?: DappSDKConnectOptions): Promise<ConnectResult> {
        await this.ensureInit(options)
        const discovery = this.discovery!
        await this.registerAdapters(discovery, options?.defaultAdapters)
        await this.registerAdapters(discovery, options?.additionalAdapters)

        clearAllLocalState()

        // Build entries from registered (non-dynamic) adapters
        const entries: WalletPickerEntry[] = discovery
            .listAdapters()
            .filter((a) => !this.dynamicAdapterIds.has(a.providerId as string))
            .map((a) => {
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

        const picked = await this.walletPicker(entries)
        let targetId = picked.providerId

        // Register a dynamic adapter for custom gateway URLs
        if (picked.type === 'remote' && picked.url) {
            const existing = discovery
                .listAdapters()
                .find((a) => a.providerId === targetId)
            if (!existing) {
                const adapter = new RemoteAdapter({
                    name: picked.name,
                    rpcUrl: picked.url,
                })
                discovery.registerAdapter(adapter)
                this.dynamicAdapterIds.add(adapter.providerId as string)
                targetId = adapter.providerId
            }
        }

        // creates provider based on the adapter
        // provider stores (and reads from storage) the session token and the access token
        await discovery.connect(targetId)

        const session = discovery.getActiveSession()
        if (!session) {
            throw new Error('Connection succeeded but no active session')
        }

        const info = session.adapter.getInfo()
        if (info.type === 'remote' && info.url) {
            storage.setKernelDiscovery({ walletType: 'remote', url: info.url })
            this.saveRecentGateway(info.name, info.url)
        } else if (info.type === 'browser') {
            storage.setKernelDiscovery({ walletType: 'extension' })
        }

        this.client = new DappClient(session.provider, {
            providerType: info.type,
        })
        const s = await this.client.status()
        return s.connection
    }

    async disconnect(): Promise<null> {
        if (this.client) {
            await this.client.disconnect()
            this.client = null
        }
        if (this.discovery) {
            try {
                await this.discovery.disconnect()
            } catch {
                // already cleaned up via DappClient.disconnect()
            }
        }
        return null
    }

    async status(): Promise<StatusEvent> {
        await this.ensureInit()
        return this.requireClient().status()
    }

    async listAccounts(): Promise<ListAccountsResult> {
        return this.requireClient().listAccounts()
    }

    async prepareExecute(params: PrepareExecuteParams): Promise<null> {
        return this.requireClient().prepareExecute(params)
    }

    async prepareExecuteAndWait(
        params: PrepareExecuteParams
    ): Promise<PrepareExecuteAndWaitResult> {
        return this.requireClient().prepareExecuteAndWait(params)
    }

    async ledgerApi(params: LedgerApiParams): Promise<LedgerApiResult> {
        return this.requireClient().ledgerApi(params)
    }

    async open(): Promise<void> {
        return this.requireClient().open()
    }

    async onStatusChanged(listener: EventListener<StatusEvent>): Promise<void> {
        this.requireClient().onStatusChanged(listener)
    }

    async onAccountsChanged(
        listener: EventListener<AccountsChangedEvent>
    ): Promise<void> {
        this.requireClient().onAccountsChanged(listener)
    }

    async onTxChanged(listener: EventListener<TxChangedEvent>): Promise<void> {
        this.requireClient().onTxChanged(listener)
    }

    async removeOnStatusChanged(
        listener: EventListener<StatusEvent>
    ): Promise<void> {
        if (!this.client) return
        this.client.removeOnStatusChanged(listener)
    }

    async removeOnAccountsChanged(
        listener: EventListener<AccountsChangedEvent>
    ): Promise<void> {
        if (!this.client) return
        this.client.removeOnAccountsChanged(listener)
    }

    async removeOnTxChanged(
        listener: EventListener<TxChangedEvent>
    ): Promise<void> {
        if (!this.client) return
        this.client.removeOnTxChanged(listener)
    }
}

export const sdk = new DappSDK()

export const connect = (
    options?: DappSDKConnectOptions
): Promise<ConnectResult> => {
    const defaultAdapters =
        options?.defaultAdapters ?? createDefaultAdapters(defaultGatewayList)
    return sdk.connect({
        ...options,
        defaultAdapters,
    })
}

export const disconnect = (): Promise<null> => sdk.disconnect()

export const status = (): Promise<StatusEvent> => sdk.status()

export const listAccounts = (): Promise<ListAccountsResult> =>
    sdk.listAccounts()

export const prepareExecute = (params: PrepareExecuteParams): Promise<null> =>
    sdk.prepareExecute(params)

export const prepareExecuteAndWait = (
    params: PrepareExecuteParams
): Promise<PrepareExecuteAndWaitResult> => sdk.prepareExecuteAndWait(params)

export const ledgerApi = (params: LedgerApiParams): Promise<LedgerApiResult> =>
    sdk.ledgerApi(params)

export const open = (): Promise<void> => sdk.open()

export const onStatusChanged = (
    listener: EventListener<StatusEvent>
): Promise<void> => sdk.onStatusChanged(listener)

export const onAccountsChanged = (
    listener: EventListener<AccountsChangedEvent>
): Promise<void> => sdk.onAccountsChanged(listener)

export const onTxChanged = (
    listener: EventListener<TxChangedEvent>
): Promise<void> => sdk.onTxChanged(listener)

export const removeOnStatusChanged = (
    listener: EventListener<StatusEvent>
): Promise<void> => sdk.removeOnStatusChanged(listener)

export const removeOnAccountsChanged = (
    listener: EventListener<AccountsChangedEvent>
): Promise<void> => sdk.removeOnAccountsChanged(listener)

export const removeOnTxChanged = (
    listener: EventListener<TxChangedEvent>
): Promise<void> => sdk.removeOnTxChanged(listener)

function createDefaultAdapters(
    defaultGatewayConfigs: (ProviderAdapterConfig & { rpcUrl: string })[]
): ProviderAdapter[] {
    return [
        new ExtensionAdapter(),
        ...defaultGatewayConfigs.map(
            (config) => new RemoteAdapter(config satisfies RemoteAdapterConfig)
        ),
    ]
}
