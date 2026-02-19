// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Re-export all discovery event types from the core package
export { EventEmitter } from '@canton-network/core-wallet-discovery'

export type {
    SessionConnectedEvent,
    SessionDisconnectedEvent,
    SessionExpiredEvent,
    ClientErrorEvent,
    DiscoveryClientEventMap,
    DiscoveryClientEventName,
    DiscoveryClientEventHandler,
} from '@canton-network/core-wallet-discovery'

// Backward-compatible aliases
export type {
    DiscoveryClientEventMap as DappClientEventMap,
    DiscoveryClientEventName as DappClientEventName,
    DiscoveryClientEventHandler as DappClientEventHandler,
} from '@canton-network/core-wallet-discovery'
