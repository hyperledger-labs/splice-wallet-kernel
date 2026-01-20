// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SpliceProvider } from './SpliceProvider'

declare global {
    interface Window {
        canton?: SpliceProvider | undefined
    }
}

export enum ProviderType {
    WINDOW,
    HTTP,
}

export function injectSpliceProvider(provider: SpliceProvider): SpliceProvider {
    // Check if the provider is already injected
    if (window.canton !== undefined) return window.canton

    // Inject the SpliceProvider instance
    window.canton = provider

    console.log('Splice provider injected successfully.')
    return window.canton
}

export * from './SpliceProvider'
export * from './SpliceProviderHttp'
export * from './SpliceProviderWindow'
