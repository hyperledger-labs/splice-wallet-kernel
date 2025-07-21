import { dapp } from './dapp-api/server.js'
import { user } from './user-api/server.js'
import { web } from './web/server.js'
import { pino } from 'pino'
import ViteExpress from 'vite-express'
import { AuthService } from 'core-wallet-auth'
import { StoreInternal } from 'core-wallet-store'
import { ConfigUtils } from './config/ConfigUtils.js'
import { configSchema } from './config/Config.js'
import { LedgerClient } from 'core-ledger-client'
import { Notifier } from './notification/NotificationService.js'
import EventEmitter from 'events'
import axios from 'axios'
import qs from 'qs'

const dAppPort = 3000
const userPort = 3001
const webPort = 3002

const logger = pino({ name: 'main', level: 'debug' })

const getServiceToken = async () => {
    //TODO: get this from config
    const tokenEndpoint = 'http://http://127.0.0.1:8889/token'
    const clientId = 'operator'
    const clientSecret = 'service-account-secret'
    const audience =
        'https://daml.com/jwt/aud/participant/participant1::1220d44fc1c3ba0b5bdf7b956ee71bc94ebe2d23258dc268fdf0824fbaeff2c61424'

    const data = {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        audience,
    }

    const response = await axios.post(tokenEndpoint, qs.stringify(data), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    return response.data.accessToken
}

const authService: AuthService = {
    verifyToken: async (accessToken?: string) => {
        // TODO: distinguish public vs private endpoints that need auth.
        if (!accessToken || !accessToken.startsWith('Bearer ')) {
            return undefined
        }

        return { userId: 'user123', accessToken: '123' }
    },
}

export class NotificationService implements NotificationService {
    private notifiers: Map<string, Notifier> = new Map()

    getNotifier(notifierId: string): Notifier {
        let notifier = this.notifiers.get(notifierId)

        if (!notifier) {
            notifier = new EventEmitter()
            this.notifiers.set(notifierId, notifier)
        }

        return notifier
    }
}

const notificationService = new NotificationService()

const configPath = process.env.NETWORK_CONFIG_PATH || '../test/config.json'
const configFile = ConfigUtils.loadConfigFile(configPath)
const config = configSchema.parse(configFile)

const store = new StoreInternal(config.store)

//TODO: potentially create a map of <networkId, ledgerClients> based off of config
const ledgerClient = new LedgerClient('http://localhost:5003', getServiceToken)

export const dAppServer = dapp(
    config.kernel,
    ledgerClient,
    notificationService,
    authService,
    store
).listen(dAppPort, () => {
    logger.info(`dApp Server running at http://localhost:${dAppPort}`)
})

export const userServer = user(
    config.kernel,
    ledgerClient,
    notificationService,
    authService,
    store
).listen(userPort, () => {
    logger.info(`User Server running at http://localhost:${userPort}`)
})

export const webServer = ViteExpress.listen(web, webPort, () =>
    logger.info(`Web server running at http://localhost:${webPort}`)
)
