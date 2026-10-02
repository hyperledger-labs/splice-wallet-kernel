// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { TrafficPurchaseClient } from '@canton-network/core-traffic-purchase'
import { AuthTokenProvider } from '@canton-network/core-wallet-auth'

/** The paymaster's off-ledger API this demo's `initialize` script serves. No auth: test-grade only. */
export function createPaymasterClient(baseUrl: string): TrafficPurchaseClient {
    return new TrafficPurchaseClient(
        baseUrl,
        console,
        AuthTokenProvider.fromToken('', console)
    )
}
