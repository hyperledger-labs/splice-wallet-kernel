import { Logger } from '@splice/core-types'

export interface OIDCConfig {
    token_endpoint: string
}

export interface ClientCredentials {
    clientId: string
    clientSecret: string
    scope: string | undefined
    audience: string | undefined
}

export class ClientCredentialsService {
    constructor(
        private configUrl: string,
        private logger: Logger | undefined
    ) {}

    /**
     * Fetches the JWT token (M2M) using client credentials.
     *
     * @returns The JWT access token as a string.
     * @throws If fetching the token fails or the response is invalid.
     */
    async fetchToken(credentials: ClientCredentials): Promise<string> {
        try {
            const oidcConfig = await this.getOIDCConfig(this.configUrl)
            this.logger?.debug({ oidcConfig }, 'Fetched OIDC config')

            const res: Response = await this.fetchTokenEndpoint(
                oidcConfig.token_endpoint,
                credentials
            )
            const json = await res.json()

            this.logger?.info(
                { response: json },
                `Fetched admin token for clientId: ${credentials.clientId}`
            )

            if (!json.access_token) {
                throw new Error('No access_token in token endpoint response')
            }

            return json.access_token
        } catch (error) {
            this.logger?.error({ err: error }, 'Failed to fetch admin token')
            throw error
        }
    }

    async fetchTokenEndpoint(
        tokenEndpoint: string,
        credentials: ClientCredentials
    ): Promise<Response> {
        const params = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: credentials.clientId,
            client_secret: credentials.clientSecret,
            scope: credentials.scope ?? '',
            audience: credentials.audience ?? '',
        })

        const res = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        })

        if (!res.ok) {
            this.logger?.error(
                { status: res.status, statusText: res.statusText },
                'Token endpoint error'
            )
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
            this.logger?.error(
                { status: res.status, statusText: res.statusText, body: text },
                'Failed to fetch OIDC config'
            )
            throw new Error(
                `OIDC config error: ${res.status} ${res.statusText}`
            )
        }
        return res.json()
    }
}

export const clientCredentialsService = (
    configUrl: string,
    logger: Logger | undefined
) => ({
    fetchToken: async (credentials: ClientCredentials) =>
        new ClientCredentialsService(configUrl, logger).fetchToken(credentials),
})
