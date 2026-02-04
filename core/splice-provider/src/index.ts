// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { UnknownRpcTypes } from '@canton-network/core-types'
import { Provider } from './provider'

declare global {
    interface Window {
        canton?: Provider<UnknownRpcTypes> | undefined
    }
}

export enum ProviderType {
    WINDOW,
    HTTP,
}

export function injectProvider<T extends UnknownRpcTypes>(
    provider: Provider<T>
): Provider<T> {
    // Check if the provider is already injected
    if (window.canton !== undefined)
        return window.canton as unknown as Provider<T>

    // Inject the Provider instance
    window.canton = provider as unknown as Provider<UnknownRpcTypes>

    console.log('Splice provider injected successfully.')
    return window.canton as unknown as Provider<T>
}

export * from './provider'
export * from './DappProvider'
export * from './DappRemoteProvider'
