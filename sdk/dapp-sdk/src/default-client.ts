// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Module-level convenience API backed by a default singleton DappClient.
 *
 * These functions provide backward-compatible top-level access to the SDK
 * (e.g. `sdk.connect()`, `sdk.status()`) while internally routing through
 * the DappClient / ProviderAdapter architecture.
 */

import { DappClient } from './client'
import type {
    EventListener,
    Provider,
} from '@canton-network/core-splice-provider'
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
    RpcTypes as DappRpcTypes,
} from '@canton-network/core-wallet-dapp-rpc-client'

let _client: DappClient | null = null
let _initPromise: Promise<void> | null = null

function getClient(config?: {
    defaultGateways?: GatewaysConfig[]
    additionalGateways?: GatewaysConfig[]
    provider?: Provider<DappRpcTypes>
}): DappClient {
    if (!_client) {
        _client = new DappClient({
            appName: 'default',
            ...config,
        })
    }
    return _client
}

async function ensureInit(config?: {
    defaultGateways?: GatewaysConfig[]
    additionalGateways?: GatewaysConfig[]
    provider?: Provider<DappRpcTypes>
}): Promise<DappClient> {
    const client = getClient(config)
    if (!_initPromise) {
        _initPromise = client.init()
    }
    await _initPromise
    return client
}

// ── Connection lifecycle ───────────────────────────────

export async function connect(options?: {
    defaultGateways?: GatewaysConfig[]
    additionalGateways?: GatewaysConfig[]
    provider?: Provider<DappRpcTypes>
}): Promise<ConnectResult> {
    const client = await ensureInit(options)
    await client.connect()
    const s = await client.status()
    return s.connection
}

export async function disconnect(): Promise<null> {
    if (!_client) return null
    await _client.disconnect()
    return null
}

// ── RPC convenience methods ────────────────────────────

export async function status(): Promise<StatusEvent> {
    const client = await ensureInit()
    return client.status()
}

export async function listAccounts(): Promise<ListAccountsResult> {
    return getClient().listAccounts()
}

export async function prepareExecute(
    params: PrepareExecuteParams
): Promise<null> {
    return getClient().prepareExecute(params)
}

export async function prepareExecuteAndWait(
    params: PrepareExecuteParams
): Promise<PrepareExecuteAndWaitResult> {
    return getClient().prepareExecuteAndWait(params)
}

export async function ledgerApi(
    params: LedgerApiParams
): Promise<LedgerApiResult> {
    return getClient().ledgerApi(params)
}

export async function open(): Promise<void> {
    return getClient().open()
}

// ── Event convenience methods ──────────────────────────

export async function onStatusChanged(
    listener: EventListener<StatusEvent>
): Promise<void> {
    getClient().onStatusChanged(listener)
}

export async function onAccountsChanged(
    listener: EventListener<AccountsChangedEvent>
): Promise<void> {
    getClient().onAccountsChanged(listener)
}

export async function onTxChanged(
    listener: EventListener<TxChangedEvent>
): Promise<void> {
    getClient().onTxChanged(listener)
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
