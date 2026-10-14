// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { HttpTransport } from '@canton-network/core-rpc-transport'
import { errorCodes, JsonRpcError } from '@canton-network/core-rpc-errors'
import UserApiClient from '@canton-network/core-wallet-user-rpc-client'

/**
 * Client for the wallet gateway User API.
 *
 * Lets a test create wallets by calling the wallet directly, instead of driving
 * its web UI with Playwright. These are the same JSON-RPC methods that UI calls
 * under the hood, and going through it reloads a page per call (~1.5s).
 *
 * Auth (self-signed networks like LocalNet): ask the gateway for a token, then
 * open a session with it. Neither call needs an existing session.
 */

/** Signing providers the gateway can allocate a wallet with. */
export type GatewaySigningProvider =
    'participant' | 'wallet-kernel' | 'blockdaemon' | 'dfns' | 'fireblocks'

export interface GatewayUserApiOptions {
    /** Gateway origin, e.g. http://localhost:3030 */
    baseUrl: string
    /** Network id as bootstrapped in the gateway config, e.g. canton:localnet */
    networkId: string
    /**
     * Client id to mint the token for. Becomes the JWT `sub`, which the gateway
     * uses as the user id. Must match the client id the dApp connects with, or
     * they end up as different users and the dApp sees no wallets.
     */
    clientId: string
    /**
     * Secret from the gateway's config for that network. The gateway refuses to
     * mint a token unless it matches, whatever the client id.
     */
    clientSecret: string
    /**
     * Origin to record on the session. Must NOT be the dApp origin: the gateway
     * keeps one session per (user, origin) and a new one replaces the old, so
     * the dApp's connect would kill this session and every later call gets 401.
     */
    origin: string
}

const isUnauthorized = (error: unknown): boolean =>
    error instanceof JsonRpcError &&
    error.code === errorCodes.provider.unauthorized

export class GatewayUserApi {
    private readonly url: URL
    private readonly options: GatewayUserApiOptions
    private client: UserApiClient

    constructor(options: GatewayUserApiOptions) {
        this.options = options
        this.url = new URL(`${options.baseUrl}/api/v0/user`)
        this.client = new UserApiClient(new HttpTransport(this.url))
    }

    /** Get a token and open a session. Calling it again replaces both. */
    async connect(): Promise<void> {
        const { accessToken } = await new UserApiClient(
            new HttpTransport(this.url)
        ).request({
            method: 'selfSignedAccessToken',
            params: {
                networkId: this.options.networkId,
                clientId: this.options.clientId,
                clientSecret: this.options.clientSecret,
            },
        })

        this.client = new UserApiClient(
            new HttpTransport(this.url, accessToken)
        )

        await this.client.request({
            method: 'addSession',
            params: {
                networkId: this.options.networkId,
                origin: this.options.origin,
            },
        })
    }

    /**
     * Create a wallet and return its party id.
     *
     * Does not check whether the wallet already exists, unlike the UI helper.
     * Tests use a random hint per run, so the check would be a wasted request.
     */
    async createWallet(args: {
        partyHint: string
        signingProvider: GatewaySigningProvider
        primary?: boolean
    }): Promise<string> {
        const { wallet } = await this.withSession((client) =>
            client.request({
                method: 'createWallet',
                params: {
                    partyHint: args.partyHint,
                    signingProviderId: args.signingProvider,
                    primary: args.primary ?? false,
                },
            })
        )
        return wallet.partyId
    }

    /**
     * Set the primary wallet. The gateway emits `accountsChanged` to the dApp,
     * same as when a user does it in the wallet UI, so an open dApp picks it up.
     */
    async setPrimaryWallet(partyId: string): Promise<void> {
        await this.withSession((client) =>
            client.request({ method: 'setPrimaryWallet', params: { partyId } })
        )
    }

    /**
     * Run a call, and on unauthorized error open a new session and try once more: another
     * client of the same gateway user may have replaced our session.
     */
    private async withSession<T>(
        call: (client: UserApiClient) => Promise<T>
    ): Promise<T> {
        try {
            return await call(this.client)
        } catch (error) {
            if (!isUnauthorized(error)) throw error
            await this.connect()
            return call(this.client)
        }
    }
}
