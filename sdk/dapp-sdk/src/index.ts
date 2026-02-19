// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Legacy API (preserved for backward compatibility)
export * from './error'
export { DappSDKProvider } from './sdk-provider'
export * from './provider/index'
export * from './provider/request'
export * from './provider/events'
export * from './provider/open'
export * as dappAPI from '@canton-network/core-wallet-dapp-rpc-client'

// New client API
export { createDappClient, DappClient } from './client'
export type { DappClientConfig } from './client'
export type { ActiveSession } from '@canton-network/core-wallet-discovery'

// Adapter types and concrete adapters
export * from './adapter/index'

// Re-export the core DiscoveryClient for direct use
export { DiscoveryClient } from '@canton-network/core-wallet-discovery'
export type { DiscoveryClientConfig } from '@canton-network/core-wallet-discovery'

// Re-export commonly used RPC types for convenience
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

// Initialize default listeners
import './listener.js'
