// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Provider } from '@canton-network/core-splice-provider'
import type {
    WalletPickerEntry,
    WalletPickerResult,
} from '@canton-network/core-types'
export type {
    WalletPickerEntry,
    WalletPickerResult,
} from '@canton-network/core-types'
import type {
    ProviderId,
    ProviderType,
    RpcTypes as DappRpcTypes,
} from '@canton-network/core-wallet-dapp-rpc-client'

export interface WalletInfo {
    providerId: ProviderId
    name: string
    type: ProviderType
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
    readonly providerId: ProviderId
    readonly name: string
    readonly type: ProviderType
    readonly icon?: string | undefined

    /** Return wallet metadata for display in the wallet picker. */
    getInfo(): WalletInfo

    /**
     * Check whether this wallet is currently available.
     * Extensions probe for the browser extension; gateways always return true.
     */
    detect(): Promise<boolean>

    /**
     * Return a Provider<DappRpcTypes> for this wallet.
     * Extension adapters return a DappProvider (openrpc-dapp-api.json).
     * Remote adapters may return a provider that bridges the
     * remote API to the dApp API surface.
     *
     * The caller is responsible for invoking `provider.request({ method: 'connect' })`
     * and `provider.request({ method: 'disconnect' })`.
     */
    provider(): Provider<DappRpcTypes>

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

/**
 * A function that presents wallet choices to the user and returns their selection.
 * This abstraction allows the DiscoveryClient to remain UI-framework agnostic.
 */
export type WalletPickerFn = (
    entries: WalletPickerEntry[]
) => Promise<WalletPickerResult>
