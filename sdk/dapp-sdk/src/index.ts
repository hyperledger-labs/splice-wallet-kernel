// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Import global Window augmentation for the DappProvider injection
import '@canton-network/core-provider-dapp'

// ── Client API (primary) ──
export { DappClient } from './client'
export type { DappClientOptions } from './client'

// ── Adapter types and concrete adapters ──
export * from './adapter/index'

// ── Core DiscoveryClient for advanced use ──
export { DiscoveryClient } from '@canton-network/core-wallet-discovery'
export type {
    DiscoveryClientConfig,
    ActiveSession,
} from '@canton-network/core-wallet-discovery'

// ── Error types ──
export * from './error'

// ── Internal types for advanced use ──
export { DappSDKProvider } from './sdk-provider'

// ── Commonly used RPC types ──
export * as dappAPI from '@canton-network/core-wallet-dapp-rpc-client'
export type {
    StatusEvent,
    ConnectResult,
    PrepareExecuteParams,
    PrepareExecuteAndWaitResult,
    SignMessageParams,
    SignMessageResult,
    LedgerApiParams,
    LedgerApiResult,
    ListAccountsResult,
    AccountsChangedEvent,
    TxChangedEvent,
    Wallet,
    Session,
    Network,
} from '@canton-network/core-wallet-dapp-rpc-client'
export type { GatewaysConfig } from '@canton-network/core-types'

// ── Module-level convenience API (default singleton DappClient) ──
export {
    connect,
    disconnect,
    status,
    listAccounts,
    prepareExecute,
    prepareExecuteAndWait,
    ledgerApi,
    open,
    onStatusChanged,
    onAccountsChanged,
    onTxChanged,
    removeOnStatusChanged,
    removeOnAccountsChanged,
    removeOnTxChanged,
} from './default-client'
