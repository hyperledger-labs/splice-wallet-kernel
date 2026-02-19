// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Re-export all discovery error types from the core package
export {
    DiscoveryError,
    WalletNotFoundError,
    WalletNotInstalledError,
    UserRejectedError,
    SessionExpiredError,
    TimeoutError,
    NotConnectedError,
} from '@canton-network/core-wallet-discovery'

export type { DiscoveryErrorCode } from '@canton-network/core-wallet-discovery'

// Backward-compatible aliases
export { DiscoveryError as DappError } from '@canton-network/core-wallet-discovery'
export type { DiscoveryErrorCode as DappErrorCode } from '@canton-network/core-wallet-discovery'
