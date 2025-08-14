import { Logger } from 'pino'
import { Auth, Network, Store } from 'core-wallet-store'

export interface OIDCConfig {
    token_endpoint: string
}

export class AdminAuthService {
    constructor(
        private store: Store,
        private logger: Logger
    ) {
        this.logger = logger.child({ component: 'admin-auth-service' })
    }

    /**
     * Fetches the JWT token (M2M) of the participant admin.
     * The admin client credentials are being used, which are defined in the auth config
     * of the network the user is connected to.
     *
     * TODO: Once the IDP/Auth is decoupled from the network,
     *       we can rely on the IDP id instead of deriving it via the user's network.
     *
     * @returns The JWT access token as a string.
     * @throws If fetching the token fails or the response is invalid.
     */
    async fetchToken(): Promise<string> {
        try {
            const network: Network = await this.store.getCurrentNetwork()
            const auth = network.auth

            const oidcConfig = await this.getOIDCConfig(auth.configUrl)
            this.logger.debug({ oidcConfig }, 'Fetched OIDC config')

            const res: Response = await this.fetchAdminToken(
                oidcConfig.token_endpoint,
                auth
            )
            const json = await res.json()

            this.logger.info(
                { response: json },
                `Fetched admin token for admin clientId: ${auth.admin?.clientId}`
            )

            if (!json.access_token) {
                throw new Error('No access_token in token endpoint response')
            }

            return json.access_token
        } catch (error) {
            this.logger.error({ err: error }, 'Failed to fetch admin token')
            throw error
        }
    }

    async fetchAdminToken(
        tokenEndpoint: string,
        auth: Auth
    ): Promise<Response> {
        const params = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: auth.admin?.clientId ?? '',
            client_secret: auth.admin?.clientSecret ?? '',
            scope: auth.scope ?? '',
            audience: auth.audience ?? '',
        })

        const res = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        })

        if (!res.ok) {
            this.logger.error(
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
            this.logger.error(
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

export const adminAuthService = (store: Store, logger: Logger) => ({
    fetchToken: () => new AdminAuthService(store, logger).fetchToken(),
})
