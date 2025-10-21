// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SpliceProvider } from './SpliceProvider'

declare global {
    interface Window {
        splice?: SpliceProvider
        canton?: SpliceProvider
        ethereum?: SpliceProvider
    }
}

export enum ProviderType {
    WINDOW,
    HTTP,
}

export function injectSpliceProvider(provider: SpliceProvider): SpliceProvider {
    // Check if the provider is already injected
    const existing = window.splice || window.canton || window.ethereum
    if (existing) return existing

    // Inject the SpliceProvider instance
    window.splice = provider
    window.canton = window.splice // For compatibility with Canton dApps
    window.ethereum = window.splice // For EIP-1193 compatibility

    console.log('Splice provider injected successfully.')

    return window.splice
}

export * from './SpliceProvider'
export * from './SpliceProviderHttp'
export * from './SpliceProviderWindow'
