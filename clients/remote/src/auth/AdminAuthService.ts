import { Logger } from 'pino'
import { Store } from 'core-wallet-store'

/**
 * Fetches the JWT token (m2m) of the participant admin.
 * The admin client credentials are being used, which are defined in the auth config
 * of the network the user is connected to.
 * @param store - The (user-authenticated) Store instance to access network configurations.
 * @param logger - Logger instance for logging debug and warning messages.
 * @returns The AuthContext containing the participant admin user and JWT token.
 */
export const adminAuthService = (store: Store, _logger: Logger) => ({
    // TODO: once the IDP/Auth is decoupled from the network,
    // we can rely on the IDP id instead of deriving it via the users network
    fetchToken: async (): Promise<string> => {
        const logger = _logger.child({ component: 'admin-auth-service' })
        try {
            const network = await store.getCurrentNetwork()
            const auth = network.auth

            logger.debug(JSON.stringify(auth), 'Using Auth')

            const response = await fetch(auth.configUrl)
            const config = await response.json()

            const statePayload = {
                configUrl: auth.configUrl,
                clientId: auth.clientId,
                audience: auth.audience,
            }

            const authParams = new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: auth.admin.clientId || '',
                client_secret: auth.admin.clientSecret || '',
                scope: auth.scope || '',
                audience: auth.audience || '',
                state: btoa(JSON.stringify(statePayload)),
            })

            const res = await fetch(config.token_endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: authParams.toString(),
            })

            const json = await res.json()
            logger.info({ json }, 'Fetched admin token')

            return json.access_token
        } catch (error) {
            logger.error(error, 'Failed to fetch admin token')
            throw error
        }
    },
})
