// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Re-export all discovery types from the core package
export type {
    WalletInfo,
    ProviderAdapter,
    WalletPickerEntry,
    WalletPickerResult,
    WalletPickerFn,
} from '@canton-network/core-wallet-discovery'

export type {
    ProviderId,
    ProviderType,
} from '@canton-network/core-wallet-dapp-rpc-client'
