// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Module-level convenience API backed by a singleton DappClient.
 *
 * Orchestrates wallet discovery (adapter registration, picker UI, custom
 * gateway URLs) and creates / manages a `DappClient` instance.
 *
 * Provides backward-compatible top-level access to the SDK
 * (e.g. `sdk.connect()`, `sdk.status()`).
 */

import {
    DiscoveryClient,
    type WalletPickerEntry,
    type WalletPickerFn,
} from '@canton-network/core-wallet-discovery'
import { pickWallet } from '@canton-network/core-wallet-ui-components'
import type { EventListener } from '@canton-network/core-splice-provider'
import type { GatewaysConfig } from '@canton-network/core-types'
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
import { RemoteAdapter } from './adapter/remote-adapter'
import * as storage from './storage'
import { clearAllLocalState } from './util'
import defaultGatewayList from './gateways.json'

const RECENT_GATEWAYS_KEY = 'splice_wallet_picker_recent'

let _discovery: DiscoveryClient | null = null
let _client: DappClient | null = null
let _initPromise: Promise<void> | null = null

const dynamicAdapterIds = new Set<string>()

// ── Discovery bootstrap ────────────────────────────────

async function ensureDiscovery(config?: {
    defaultGateways?: GatewaysConfig[]
    additionalGateways?: GatewaysConfig[]
}): Promise<DiscoveryClient> {
    if (_discovery) return _discovery

    _discovery = new DiscoveryClient({
        walletPicker: pickWallet as WalletPickerFn,
    })

    const ext = new ExtensionAdapter()
    if (await ext.detect()) {
        _discovery.registerAdapter(ext)
    }

    const allGateways = [
        ...(config?.defaultGateways ?? defaultGatewayList),
        ...(config?.additionalGateways ?? []),
    ]
    for (const gw of allGateways) {
        _discovery.registerAdapter(
            new RemoteAdapter({ name: gw.name, rpcUrl: gw.rpcUrl })
        )
    }

    await _discovery.init()

    // If a session was restored, create the DappClient immediately
    const session = _discovery.getActiveSession()
    if (session) {
        const providerType = session.adapter.getInfo().type
        _client = new DappClient(session.provider, { providerType })
    }

    return _discovery
}

async function ensureInit(config?: {
    defaultGateways?: GatewaysConfig[]
    additionalGateways?: GatewaysConfig[]
}): Promise<void> {
    if (!_initPromise) {
        _initPromise = ensureDiscovery(config).then(() => undefined)
    }
    await _initPromise
}

// ── Recently-used gateway persistence ──────────────────

function saveRecentGateway(name: string, rpcUrl: string): void {
    try {
        const raw = localStorage.getItem(RECENT_GATEWAYS_KEY)
        const recent: { name: string; rpcUrl: string }[] = raw
            ? JSON.parse(raw)
            : []
        const filtered = recent.filter((r) => r.rpcUrl !== rpcUrl)
        filtered.unshift({ name, rpcUrl })
        localStorage.setItem(
            RECENT_GATEWAYS_KEY,
            JSON.stringify(filtered.slice(0, 5))
        )
    } catch {
        // best-effort
    }
}

// ── Connection lifecycle ───────────────────────────────

export async function connect(options?: {
    defaultGateways?: GatewaysConfig[]
    additionalGateways?: GatewaysConfig[]
}): Promise<ConnectResult> {
    await ensureInit(options)
    const discovery = _discovery!

    clearAllLocalState()

    // Build entries from registered (non-dynamic) adapters
    const entries: WalletPickerEntry[] = discovery
        .listAdapters()
        .filter((a) => !dynamicAdapterIds.has(a.providerId as string))
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

    const picked = await pickWallet(entries)
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
            dynamicAdapterIds.add(adapter.providerId as string)
            targetId = adapter.providerId
        }
    }

    // creates provider based on the adapter
    // provider stores (and reads from storage) the session token and the access token
    await discovery.connect(targetId)

    const session = discovery.getActiveSession()
    if (!session) throw new Error('Connection succeeded but no active session')

    const info = session.adapter.getInfo()
    if (info.type === 'remote' && info.url) {
        storage.setKernelDiscovery({ walletType: 'remote', url: info.url })
        saveRecentGateway(info.name, info.url)
    } else if (info.type === 'browser') {
        storage.setKernelDiscovery({ walletType: 'extension' })
    }

    _client = new DappClient(session.provider, { providerType: info.type })
    const s = await _client.status()
    return s.connection
}

export async function disconnect(): Promise<null> {
    if (_client) {
        await _client.disconnect()
        _client = null
    }
    if (_discovery) {
        try {
            await _discovery.disconnect()
        } catch {
            // already cleaned up via DappClient.disconnect()
        }
    }
    return null
}

// ── Helpers ────────────────────────────────────────────

function requireClient(): DappClient {
    if (!_client) throw new Error('Not connected — call connect() first')
    return _client
}

// ── RPC convenience methods ────────────────────────────

export async function status(): Promise<StatusEvent> {
    await ensureInit()
    return requireClient().status()
}

export async function listAccounts(): Promise<ListAccountsResult> {
    return requireClient().listAccounts()
}

export async function prepareExecute(
    params: PrepareExecuteParams
): Promise<null> {
    return requireClient().prepareExecute(params)
}

export async function prepareExecuteAndWait(
    params: PrepareExecuteParams
): Promise<PrepareExecuteAndWaitResult> {
    return requireClient().prepareExecuteAndWait(params)
}

export async function ledgerApi(
    params: LedgerApiParams
): Promise<LedgerApiResult> {
    return requireClient().ledgerApi(params)
}

export async function open(): Promise<void> {
    return requireClient().open()
}

// ── Event convenience methods ──────────────────────────

export async function onStatusChanged(
    listener: EventListener<StatusEvent>
): Promise<void> {
    requireClient().onStatusChanged(listener)
}

export async function onAccountsChanged(
    listener: EventListener<AccountsChangedEvent>
): Promise<void> {
    requireClient().onAccountsChanged(listener)
}

export async function onTxChanged(
    listener: EventListener<TxChangedEvent>
): Promise<void> {
    requireClient().onTxChanged(listener)
}

export async function removeOnStatusChanged(
    listener: EventListener<StatusEvent>
): Promise<void> {
    if (!_client) return
    _client.removeOnStatusChanged(listener)
}

export async function removeOnAccountsChanged(
    listener: EventListener<AccountsChangedEvent>
): Promise<void> {
    if (!_client) return
    _client.removeOnAccountsChanged(listener)
}

export async function removeOnTxChanged(
    listener: EventListener<TxChangedEvent>
): Promise<void> {
    if (!_client) return
    _client.removeOnTxChanged(listener)
}
