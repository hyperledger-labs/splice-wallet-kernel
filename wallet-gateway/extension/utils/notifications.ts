// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { DappNotificationEvent } from '@canton-network/core-wallet-services'

/**
 * Name of the `runtime.Port` the content script opens to the background script
 * to receive dApp notifications (CIP-103 events).
 */
export const NOTIFICATIONS_PORT_NAME = 'wg-dapp-notifications'

/**
 * A notification sent from the background script to the content script over the
 * notifications port. The content script relays it to the dApp page as an
 * id-less JSON-RPC request (a JSON-RPC notification).
 */
export interface NotificationPortMessage {
    method: DappNotificationEvent
    params?: unknown
}
