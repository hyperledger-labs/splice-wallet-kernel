// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { TrafficPurchaseClient } from '@canton-network/core-traffic-purchase'
import type { AccessTokenProvider } from '@canton-network/core-wallet-auth'

/**
 * A provider for an API that wants no token at all.
 *
 * Not `AuthTokenProvider.fromToken('')`: that runs the empty string through the JWT expiry check,
 * which cannot decode it and so reports it as expired, failing every request before it is sent.
 * `TrafficPurchaseClient` already omits the `Authorization` header when the token is empty, so
 * handing it one directly is what "no auth" actually means here.
 */
const noAuth: AccessTokenProvider = {
    getAccessToken: async () => '',
    getAuthContext: async () => ({ userId: '', accessToken: '' }),
}

/** The paymaster's off-ledger API this demo's `initialize` script serves. No auth: test-grade only. */
export function createPaymasterClient(baseUrl: string): TrafficPurchaseClient {
    return new TrafficPurchaseClient(baseUrl, console, noAuth)
}
