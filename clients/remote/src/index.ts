import { dapp } from './dapp-api/server.js'
import { user } from './user-api/server.js'
import { web } from './web/server.js'
import { pino } from 'pino'
import ViteExpress from 'vite-express'
import { AuthService } from 'core-wallet-auth'
import { StoreInternal } from 'core-wallet-store'
import { ConfigUtils } from './config/ConfigUtils.js'
import { configSchema } from './config/Config.js'
import { Notifier } from './notification/NotificationService.js'
import EventEmitter from 'events'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const dAppPort = 3000
const userPort = 3001
const webPort = 3002

const logger = pino({ name: 'main', level: 'debug' })

export class NotificationService implements NotificationService {
    private notifiers: Map<string, Notifier> = new Map()

    getNotifier(notifierId: string): Notifier {
        let notifier = this.notifiers.get(notifierId)

        if (!notifier) {
            notifier = new EventEmitter()
            // Wrap all events to log with pino
            const originalEmit = notifier.emit
            notifier.emit = function (event: string, ...args: unknown[]) {
                logger.debug(
                    { event, args },
                    `Notifier emitted event: ${event}`
                )
                return originalEmit.apply(this, [event, ...args])
            }
            this.notifiers.set(notifierId, notifier)
        }

        return notifier
    }
}

const notificationService = new NotificationService()

const configPath = process.env.NETWORK_CONFIG_PATH || '../test/config.json'
const configFile = ConfigUtils.loadConfigFile(configPath)
const config = configSchema.parse(configFile)

const authService: AuthService = {
    verifyToken: async (accessToken?: string) => {
        if (!accessToken || !accessToken.startsWith('Bearer ')) {
            return undefined
        }

        const jwt = accessToken.split(' ')[1]
        try {
            // TODO: get JWKS URL from network config for the active network/session
            const jwks = createRemoteJWKSet(
                new URL('http://127.0.0.1:8889/jwks')
            )

            const { payload } = await jwtVerify(jwt, jwks, {
                algorithms: ['RS256'],
            })

            if (!payload.sub) {
                return undefined
            }

            return { userId: payload.sub, accessToken: jwt }
        } catch (error) {
            if (error instanceof Error) {
                logger.warn('Failed to verify token ' + error.message)
            }
            return undefined
        }
    },
}

const store = new StoreInternal(config.store)

export const dAppServer = dapp(
    config.kernel,
    notificationService,
    authService,
    store
).listen(dAppPort, () => {
    logger.info(`dApp Server running at http://localhost:${dAppPort}`)
})

export const userServer = user(
    config.kernel,
    notificationService,
    authService,
    store
).listen(userPort, () => {
    logger.info(`User Server running at http://localhost:${userPort}`)
})

export const webServer = ViteExpress.listen(web, webPort, () =>
    logger.info(`Web server running at http://localhost:${webPort}`)
)
