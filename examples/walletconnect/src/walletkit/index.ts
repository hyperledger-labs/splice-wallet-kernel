// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export { walletHandler, subscribe } from './handler'
export type { WalletHandler, WalletEvent, WalletEventCallback } from './handler'
export type { PendingProposal, PendingRequest, SessionInfo } from './types'
export {
    listWallets,
    listNetworks,
    bootstrapSession,
    setPrimaryWallet,
} from './gateway'
export type { NetworkInfo } from './gateway'
