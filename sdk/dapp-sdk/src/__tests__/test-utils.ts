// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { vi, type Mock } from 'vitest'
import type { Provider } from '@canton-network/core-splice-provider'
import type { RpcTypes as DappRpcTypes } from '@canton-network/core-wallet-dapp-rpc-client'

/**
 * A dapp provider mock that is also assignable to Provider<DappRpcTypes>,
 * so tests can pass it to source code directly and still call vitest mock
 * methods (mockResolvedValue, toHaveBeenCalledWith, ...) on its members
 * without casting.
 */

export type MockProvider = Provider<DappRpcTypes> & {
    request: Mock<Provider<DappRpcTypes>['request']>
    on: Mock<Provider<DappRpcTypes>['on']>
    removeListener: Mock<Provider<DappRpcTypes>['removeListener']>
}

export const makeMockProvider = (): MockProvider =>
    ({
        request: vi.fn(),
        on: vi.fn(),
        removeListener: vi.fn(),
    }) as unknown as MockProvider
