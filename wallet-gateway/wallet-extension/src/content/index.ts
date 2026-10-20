// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { announceSelf } from './announce-self'
import { jsonRpcProxy } from './json-rpc-proxy'
import { createNotificationRelay } from './notification-relay'

/**
 * Runs in the content script: announces the wallet to the page, proxies dApp
 * JSON-RPC requests to the background and relays notifications back.
 */
export function startContent(): void {
    announceSelf()
    jsonRpcProxy(createNotificationRelay())
}
