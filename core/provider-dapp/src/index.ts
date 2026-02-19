// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export * from './DappProvider'
export * from './DappAsyncProvider'

import { RpcTypes } from '@canton-network/core-wallet-dapp-rpc-client'
import { Provider } from '@canton-network/core-splice-provider'

type DappProviderInterface = Provider<RpcTypes>

declare global {
    interface Window {
        // we assume that we will always use a full DappProvider in the browser context
        canton?: DappProviderInterface | undefined
    }
}

export enum ProviderType {
    WINDOW,
    HTTP,
}

export function injectProvider(
    provider: DappProviderInterface
): DappProviderInterface {
    // Check if the provider is already injected
    if (window.canton !== undefined) return window.canton

    // Inject the Provider instance
    window.canton = provider

    console.log('Splice provider injected successfully.')
    return window.canton
}
