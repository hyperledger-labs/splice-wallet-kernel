// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LedgerClient } from '@canton-network/core-ledger-client'
import { AuthTokenProvider } from '@canton-network/core-wallet-auth'
import { HttpTransport } from '@canton-network/core-rpc-transport'
import UserApiClient from '@canton-network/core-wallet-user-rpc-client'

/**
 * Creates ledger users on the participant.
 *
 * Needed when tests connect to the gateway with a client id other than the one
 * in its network config (for example one user per Playwright worker).
 *
 * Why: the gateway accepts any JWT `sub` and just scopes wallets under it, but
 * it forwards that same token to the participant, and Canton answers
 * USER_NOT_FOUND if no user with that id exists there.
 */

export interface EnsureLedgerUsersOptions {
    /** Gateway origin, e.g. http://localhost:3030 */
    gatewayUrl: string
    /** Participant ledger API, e.g. http://localhost:2975 */
    ledgerApiUrl: string
    /** Network id in the gateway, e.g. canton:localnet */
    networkId: string
    /**
     * Client id from the gateway's config for that network. A user with this id
     * exists on the participant, which is why it can mint the admin token.
     */
    adminClientId: string
    /** Secret from the gateway's config for that network. Required to mint. */
    clientSecret: string
    /** User ids to create. Existing ones are skipped. */
    userIds: string[]
}

/**
 * Create each user on the participant, skipping the ones that exist.
 *
 * The admin token comes from the gateway instead of being signed here, so tests
 * do not need the network's signing secret.
 */
export async function ensureLedgerUsers(
    options: EnsureLedgerUsersOptions
): Promise<void> {
    if (options.userIds.length === 0) return

    const { accessToken } = await new UserApiClient(
        new HttpTransport(new URL(`${options.gatewayUrl}/api/v0/user`))
    ).request({
        method: 'selfSignedAccessToken',
        params: {
            networkId: options.networkId,
            clientId: options.adminClientId,
            clientSecret: options.clientSecret,
        },
    })

    const ledger = new LedgerClient({
        baseUrl: new URL(options.ledgerApiUrl),
        accessTokenProvider: AuthTokenProvider.fromToken(accessToken),
    })

    for (const userId of options.userIds) {
        // No primary party: these users only need to exist so the participant
        // accepts their tokens. createUser is a no-op if the user is there.
        await ledger.createUser(userId, '')
    }
}
