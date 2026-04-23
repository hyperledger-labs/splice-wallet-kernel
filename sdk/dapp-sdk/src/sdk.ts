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
import {
    notifyWalletPickerConnected,
    notifyWalletPickerError,
    pickWallet,
    waitForWalletPickerRetrySelection,
} from '@canton-network/core-wallet-ui-components'
import type {
    EventListener,
    Provider,
} from '@canton-network/core-splice-provider'
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
    RpcTypes as DappRpcTypes,
} from '@canton-network/core-wallet-dapp-rpc-client'
import { DappClient } from './client'
import { ExtensionAdapter } from './adapter/extension-adapter'
import { InjectedAdapter } from './adapter/injected-adapter'
import {
    RemoteAdapter,
    type RemoteAdapterConfig,
} from './adapter/remote-adapter'
import * as storage from './storage'
import { clearAllLocalState } from './util'
import defaultGatewayList from './gateways.json'
import { CANTON_LOGO_PNG } from './assets'
import { discoverInjectedProviders } from './injected-discovery'
import { requestAnnouncedProviders } from './announce-discovery'

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

    private async registerInjectedNamespaceAdapters(
        discovery: DiscoveryClient
    ): Promise<void> {
        const existingIds = new Set(
            discovery.listAdapters().map((a) => a.providerId as string)
        )

        const injected = discoverInjectedProviders()
        for (const item of injected) {
            const id = `browser:${item.id}`
            if (existingIds.has(id)) continue

            const key = `${item.id} (injected)`
            const adapter = new InjectedAdapter({
                id: item.id,
                name: key,
                provider: item.provider,
                description: `Injected provider from window.${item.id}`,
            })
            discovery.registerAdapter(adapter)
            existingIds.add(id)
        }
    }

    private async registerAnnouncedAdapters(
        discovery: DiscoveryClient
    ): Promise<void> {
        const existingIds = new Set(
            discovery.listAdapters().map((a) => a.providerId as string)
        )

        const announced = await requestAnnouncedProviders()
        for (const item of announced) {
            const id = `browser:ext:${item.id}`
            if (existingIds.has(id)) continue

            const adapter = new ExtensionAdapter({
                providerId: id as never,
                name: item.name,
                icon: item.icon,
                description: 'Connect via a browser extension wallet',
                target: item.target ?? item.id,
            })
            if (await adapter.detect()) {
                discovery.registerAdapter(adapter)
                existingIds.add(id)
            }
        }
    }

    private async ensureDiscovery(
        config?: DappSDKConnectOptions
    ): Promise<DiscoveryClient> {
        const defaultAdapters =
            config?.defaultAdapters ?? createDefaultAdapters(defaultGatewayList)

        const additionalAdapters = config?.additionalAdapters ?? []

        if (this.discovery) {
            await this.registerAdapters(this.discovery, defaultAdapters)
            await this.registerAdapters(this.discovery, additionalAdapters)
            await this.registerInjectedNamespaceAdapters(this.discovery)
            await this.registerAnnouncedAdapters(this.discovery)
            await this.discovery.restorePersistedSessionIfNeeded()
            if (!this.client) {
                const session = this.discovery.getActiveSession()
                if (session) {
                    const providerType = session.adapter.getInfo().type
                    const target =
                        session.adapter instanceof ExtensionAdapter
                            ? session.adapter.target
                            : undefined
                    this.client = new DappClient(session.provider, {
                        providerType,
                        target,
                    })
                }
            }
            return this.discovery
        }

        const initialAdapters = await this.collectDetectedAdapters([
            ...defaultAdapters,
            ...additionalAdapters,
        ])

        this.discovery = await DiscoveryClient.create({
            walletPicker: this.walletPicker,
            adapters: initialAdapters,
        })

        await this.registerInjectedNamespaceAdapters(this.discovery)
        await this.registerAnnouncedAdapters(this.discovery)
        await this.discovery.restorePersistedSessionIfNeeded()

        // If a session was restored, create the DappClient immediately
        const session = this.discovery.getActiveSession()
        if (session) {
            const providerType = session.adapter.getInfo().type
            // target is the postMessage routing key for extension adapters
            const target =
                session.adapter instanceof ExtensionAdapter
                    ? session.adapter.target
                    : undefined
            this.client = new DappClient(session.provider, {
                providerType,
                target,
            })
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

    private getHttpStatusCode(error: unknown): number | undefined {
        const asNumber = (value: unknown): number | undefined =>
            typeof value === 'number' ? value : undefined

        if (typeof error !== 'object' || error === null) return undefined

        const obj = error as Record<string, unknown>
        const response = obj.response as Record<string, unknown> | undefined
        const cause = obj.cause as Record<string, unknown> | undefined

        return (
            asNumber(obj.status) ??
            asNumber(obj.statusCode) ??
            asNumber(response?.status) ??
            asNumber(cause?.status) ??
            asNumber(cause?.statusCode)
        )
    }

    private formatConnectionErrorMessage(error: unknown): string {
        const fallbackMessage = 'Failed to connect wallet'
        const baseMessage =
            error instanceof Error && error.message.trim().length > 0
                ? error.message
                : fallbackMessage

        const statusCode = this.getHttpStatusCode(error)
        if (!statusCode) return baseMessage

        const lowerMessage = baseMessage.toLowerCase()
        if (
            lowerMessage.includes(`http ${statusCode}`) ||
            lowerMessage.includes(`status ${statusCode}`)
        ) {
            return baseMessage
        }

        return `${baseMessage} (HTTP ${statusCode})`
    }

    private requireClient(): DappClient {
        if (!this.client)
            throw new Error('Not connected — call connect() first')
        return this.client
    }

    /**
     * Returns the raw connected provider instance (if any).
     *
     * This is useful for advanced integrations that need to call methods that
     * are not wrapped by the higher-level SDK helpers.
     */
    getConnectedProvider(): Provider<DappRpcTypes> | null {
        const session = this.discovery?.getActiveSession()
        if (!session) return null
        return session.provider
    }

    /**
     * Register adapters and restore any persisted session without showing
     * the wallet picker. Call this on mount so that WalletConnect (or other
     * adapter) sessions are available before the user explicitly connects.
     */
    async init(options?: DappSDKConnectOptions): Promise<void> {
        await this.ensureInit(options)
    }

    async connect(options?: DappSDKConnectOptions): Promise<ConnectResult> {
        await this.ensureInit(options)
        const discovery = this.discovery!
        await this.registerInjectedNamespaceAdapters(discovery)
        await this.registerAnnouncedAdapters(discovery)
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
                    reuseGlobalWalletPopup: info.reuseGlobalWalletPopup,
                }
            })

        const initialSelection = await this.walletPicker(entries)
        const connectionAttempts = new EventTarget()

        return new Promise<ConnectResult>((resolve, reject) => {
            const cleanup = () => {
                connectionAttempts.removeEventListener('attempt', onAttempt)
            }

            const onAttempt = async (event: Event): Promise<void> => {
                const picked = (event as CustomEvent<WalletPickerEntry>).detail
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

                try {
                    // creates provider based on the adapter
                    // provider stores (and reads from storage) the session token and the access token
                    await discovery.connect(targetId)

                    const session = discovery.getActiveSession()
                    if (!session) {
                        throw new Error(
                            'Connection succeeded but no active session'
                        )
                    }

                    const info = session.adapter.getInfo()

                    this.client = new DappClient(session.provider, {
                        providerType: info.type,
                        target:
                            session.adapter instanceof ExtensionAdapter
                                ? session.adapter.target
                                : undefined,
                    })
                    const s = await this.client.status()

                    if (s.connection.isConnected) {
                        if (info.type === 'remote' && info.url) {
                            storage.setKernelDiscovery({
                                walletType: 'remote',
                                url: info.url,
                            })
                            this.saveRecentGateway(info.name, info.url)
                        } else if (info.type === 'browser') {
                            storage.setKernelDiscovery({
                                walletType: 'extension',
                                providerId: info.providerId as string,
                            })
                        }
                    }

                    notifyWalletPickerConnected(info.reuseGlobalWalletPopup)
                    cleanup()
                    resolve(s.connection)
                } catch (error) {
                    const message = this.formatConnectionErrorMessage(error)
                    notifyWalletPickerError(message)

                    this.client = null

                    try {
                        const retrySelection =
                            await waitForWalletPickerRetrySelection()
                        connectionAttempts.dispatchEvent(
                            new CustomEvent<WalletPickerEntry>('attempt', {
                                detail: retrySelection,
                            })
                        )
                    } catch (retryError) {
                        cleanup()
                        reject(retryError)
                    }
                }
            }

            connectionAttempts.addEventListener('attempt', onAttempt)
            connectionAttempts.dispatchEvent(
                new CustomEvent<WalletPickerEntry>('attempt', {
                    detail: initialSelection,
                })
            )
        })
    }

    async disconnect(): Promise<null> {
        // This may result in double call to dapp-api with method `disconnect` and double event `statusChanged`
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

    async isConnected(): Promise<ConnectResult> {
        if (this.client) {
            return this.client.isConnected()
        }
        return {
            isConnected: false,
            isNetworkConnected: false,
            reason: 'Unauthenticated',
            networkReason: 'Unauthenticated',
        }
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

    async onConnected(listener: EventListener<StatusEvent>): Promise<void> {
        this.requireClient().onConnected(listener)
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

    async removeOnConnected(
        listener: EventListener<StatusEvent>
    ): Promise<void> {
        if (!this.client) return
        this.client.removeOnConnected(listener)
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
    // TODO why this bit of logic is present only in exported method and not in class method?
    const defaultAdapters =
        options?.defaultAdapters ?? createDefaultAdapters(defaultGatewayList)
    return sdk.connect({
        ...options,
        defaultAdapters,
    })
}

export const init = (options?: DappSDKConnectOptions): Promise<void> =>
    sdk.init(options)

export const disconnect = (): Promise<null> => sdk.disconnect()

export const isConnected = (): Promise<ConnectResult> => sdk.isConnected()

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

export const getConnectedProvider = (): ReturnType<
    DappSDK['getConnectedProvider']
> => sdk.getConnectedProvider()

export const onStatusChanged = (
    listener: EventListener<StatusEvent>
): Promise<void> => sdk.onStatusChanged(listener)

export const onAccountsChanged = (
    listener: EventListener<AccountsChangedEvent>
): Promise<void> => sdk.onAccountsChanged(listener)

export const onConnected = (
    listener: EventListener<StatusEvent>
): Promise<void> => sdk.onConnected(listener)

export const onTxChanged = (
    listener: EventListener<TxChangedEvent>
): Promise<void> => sdk.onTxChanged(listener)

export const removeOnStatusChanged = (
    listener: EventListener<StatusEvent>
): Promise<void> => sdk.removeOnStatusChanged(listener)

export const removeOnAccountsChanged = (
    listener: EventListener<AccountsChangedEvent>
): Promise<void> => sdk.removeOnAccountsChanged(listener)

export const removeOnConnected = (
    listener: EventListener<StatusEvent>
): Promise<void> => sdk.removeOnConnected(listener)

export const removeOnTxChanged = (
    listener: EventListener<TxChangedEvent>
): Promise<void> => sdk.removeOnTxChanged(listener)

function createDefaultAdapters(
    defaultGatewayConfigs: RemoteAdapterConfig[]
): ProviderAdapter[] {
    return defaultGatewayConfigs.map(
        (config) =>
            new RemoteAdapter({
                ...config,
                icon: config.icon ?? CANTON_LOGO_PNG,
            } satisfies RemoteAdapterConfig)
    )
}
