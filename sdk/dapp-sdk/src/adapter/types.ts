// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Provider } from '@canton-network/core-splice-provider'
import type { RpcTypes as DappRpcTypes } from '@canton-network/core-wallet-dapp-rpc-client'

/**
 * Wallet type discriminator:
 * - 'extension': uses DappProvider (openrpc-dapp-api.json) via postMessage
 * - 'gateway':   uses DappAsyncProvider (openrpc-dapp-remote-api.json) via HTTP/SSE,
 *                bridged to the dApp API surface by DappSDKProvider
 */
export type WalletType = 'extension' | 'gateway'

export type WalletId = string & { readonly __brand: unique symbol }
export const toWalletId = (id: string): WalletId => id as WalletId

export interface WalletInfo {
    walletId: WalletId
    name: string
    type: WalletType
    description?: string | undefined
    icon?: string | undefined
    url?: string | undefined
}

/**
 * A ProviderAdapter is a thin factory that knows how to create a
 * Provider<DappRpcTypes> for a particular wallet type, detect its
 * availability, and clean up resources.
 *
 * All RPC methods (connect, disconnect, status, prepareExecute, etc.)
 * are called directly on the provider — the adapter does not duplicate them.
 */
export interface ProviderAdapter {
    readonly walletId: WalletId
    readonly name: string
    readonly type: WalletType
    readonly icon?: string | undefined

    /** Return wallet metadata for display in the wallet picker. */
    getInfo(): WalletInfo

    /**
     * Check whether this wallet is currently available.
     * Extensions probe for the browser extension; gateways always return true.
     */
    detect(): Promise<boolean>

    /**
     * Create and return the Provider<DappRpcTypes>.
     * Extension adapters return a DappProvider (openrpc-dapp-api.json).
     * Gateway adapters return a DappSDKProvider that bridges the
     * remote API to the dApp API surface.
     *
     * The caller is responsible for invoking `provider.request({ method: 'connect' })`
     * and `provider.request({ method: 'disconnect' })`.
     */
    createProvider(): Provider<DappRpcTypes>

    /**
     * Clean up adapter-specific resources (e.g. close popup windows).
     * Called after disconnect. Does NOT call disconnect on the provider.
     */
    teardown(): void

    /**
     * Attempt to restore a previous session (e.g. from localStorage).
     * Returns a ready-to-use provider if the session was restored, or null.
     */
    restore?(): Promise<Provider<DappRpcTypes> | null>
}
