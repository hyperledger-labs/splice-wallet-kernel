// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { getLogger, lazy } from '@logtape/logtape'
import type { ClientCredentials, OIDCConfig } from './auth-service.js'

export class ClientCredentialsService {
    private logger = getLogger([
        'core',
        'wallet-auth',
        'client-credentials-service',
    ]).with({ configUrl: lazy(() => this.configUrl) })

    constructor(private configUrl: string) {}

    /**
     * Fetches the JWT token (M2M) using client credentials.
     *
     * @returns The JWT access token as a string.
     * @throws If fetching the token fails or the response is invalid.
     */
    async fetchToken(credentials: ClientCredentials): Promise<string> {
        try {
            const oidcConfig = await this.getOIDCConfig(this.configUrl)
            this.logger.debug('Fetched OIDC config', { oidcConfig })

            const res: Response = await this.fetchTokenEndpoint(
                oidcConfig.token_endpoint,
                credentials
            )
            const json = await res.json()

            if (this.logger.isEnabledFor('debug')) {
                this.logger.debug(
                    `Fetched admin token for clientId: {clientId}`,
                    { clientId: credentials.clientId }
                )
            } else {
                this.logger.info(
                    `Fetched admin token for clientId: {clientId}`,
                    { clientId: credentials.clientId, response: json }
                )
            }

            if (!json.access_token) {
                throw new Error('No access_token in token endpoint response')
            }

            return json.access_token
        } catch (error) {
            this.logger.warn('Failed to fetch admin token', { error })
            throw error
        }
    }

    async fetchTokenEndpoint(
        tokenEndpoint: string,
        credentials: ClientCredentials
    ): Promise<Response> {
        const params = new URLSearchParams({
            grant_type: 'client_credentials',
            scope: credentials.scope ?? '',
            audience: credentials.audience ?? '',
        })

        const password = toClientPassword(
            credentials.clientId,
            credentials.clientSecret
        )

        const res = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${password}`,
            },
            body: params.toString(),
        })

        if (!res.ok) {
            this.logger.warn('Token endpoint error', {
                status: res.status,
                statusText: res.statusText,
            })

            throw new Error(
                `Token endpoint error: ${res.status} ${res.statusText}`
            )
        }

        return res
    }

    async getOIDCConfig(url: string): Promise<OIDCConfig> {
        const res = await fetch(url)
        if (!res.ok) {
            const text = await res.text()
            this.logger.warn('Failed to fetch OIDC config', {
                status: res.status,
                statusText: res.statusText,
                body: text,
            })

            throw new Error(
                `OIDC config error: ${res.status} ${res.statusText}`
            )
        }
        return res.json()
    }
}

const toClientPassword = (clientId: string, clientSecret: string): string => {
    const credentials = `${clientId}:${clientSecret}`
    return btoa(credentials)
}

export const clientCredentialsService = (configUrl: string) => ({
    fetchToken: async (credentials: ClientCredentials) =>
        new ClientCredentialsService(configUrl).fetchToken(credentials),
})
