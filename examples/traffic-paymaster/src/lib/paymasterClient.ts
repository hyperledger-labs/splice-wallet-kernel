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

/**
 * Reads a party's traffic balance through the paymaster server's own
 * `/traffic/{accountId}` route, rather than the ledger's `/v2/traffic/accounts`
 * endpoint directly.
 *
 * `getTraffic` needs `ActAs`/`ExecuteAs` rights on the party, which the browser
 * -- authenticated as a connected wallet's self-signing external party -- does
 * not hold, so the participant answers PERMISSION_DENIED (a "security-sensitive
 * error"). The paymaster server runs the admin SDK's ledger-API user, which
 * does hold those rights, so the UI asks it instead.
 */
export async function fetchTrafficBalance(
    baseUrl: string,
    accountId: string
): Promise<number> {
    const url = `${baseUrl.replace(/\/$/, '')}/registry/traffic-purchase/v1/traffic/${encodeURIComponent(accountId)}`
    const response = await fetch(url)
    const body: unknown = await response.json().catch(() => undefined)
    if (!response.ok) {
        const message =
            body !== null &&
            typeof body === 'object' &&
            'error' in body &&
            typeof body.error === 'string'
                ? body.error
                : `The paymaster at ${baseUrl} answered ${response.status} for the traffic balance.`
        throw new Error(message)
    }
    if (
        body === null ||
        typeof body !== 'object' ||
        !('balance' in body) ||
        typeof body.balance !== 'number'
    ) {
        throw new Error(
            `The paymaster at ${baseUrl} returned no numeric balance for ${accountId}.`
        )
    }
    return body.balance
}
