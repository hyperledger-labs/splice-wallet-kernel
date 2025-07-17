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

const dAppPort = 3000
const userPort = 3001
const webPort = 3002

const logger = pino({ name: 'main', level: 'debug' })
const fakeToken =
    'eyJraWQiOiJjNTdhNTAxNzk4NmYwYzMxNjgyMGQyMmE4MGEyMWZlMjMwODI5NTVmYjkyYzUzYWJjYWE2NDA3ZWE3NmIyNTEzNzBiOTU0MGI3ZDkxYThhNiIsInR5cCI6IkpXVCIsImFsZyI6IlJTMjU2In0.eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwODIiLCJpYXQiOjE3NTI3Njc2NjQsImV4cCI6MTc1Mjc3MTI2NCwibmJmIjoxNzUyNzY3NjU0LCJzdWIiOiJqb2huZG9lIiwiYW1yIjpbInB3ZCJdLCJzY29wZSI6ImR1bW15In0.aKWl3q-zuTEFNKRMY5nWOnw3VzA-tJWnN5-HocuNJXlh0vpRIcD8BgxTDEhhn05mt5-xkzVvtzztKNIZs2IWTZUGGFBokvBRiPXO7aJByo4SVSYbHw5xN4XVq2wJ2KukWxls46av97dPJR3fsPBZUtp8QmaIv9woA7KBWejUIJpCJxHR6VTPptw8XmcjTE5v8YZdyl7k-GnAfyrHAGfiorkfTwfUPl29wVg2ABRaBz6iVc2lEkeLn1SRixFi8PM4j8DszceQNYA3Ut2Lr-L5IpahynrST0Fcswe7leDVrNMvT360FahyUmdYifdSgb1YIdQDjACKiONLfNnxEgeZ5A'

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
const ledgerClient = new LedgerClient('http://localhost:5003', async () => {
    return fakeToken
})

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
