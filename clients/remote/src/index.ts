import { dapp } from './dapp-api/server.js'
import { user } from './user-api/server.js'
import { web } from './web/server.js'
import { pino } from 'pino'
import ViteExpress from 'vite-express'
import { AuthService } from 'core-wallet-auth'
import { StoreInternal, StoreInternalConfig } from 'core-wallet-store'

const dAppPort = 3000
const userPort = 3001
const webPort = 3002

const logger = pino({ name: 'main', level: 'debug' })

const authService: AuthService = {
    verifyToken: async () => {
        return new Promise((resolve) => resolve({ userId: 'user123' }))
    },
}

const config: StoreInternalConfig = {
    networks: [],
}
const store = new StoreInternal(config)

export const dAppServer = dapp(authService, store).listen(dAppPort, () => {
    logger.info(`dApp Server running at http://localhost:${dAppPort}`)
})

export const userServer = user(authService, store).listen(userPort, () => {
    logger.info(`User Server running at http://localhost:${userPort}`)
})

export const webServer = ViteExpress.listen(web, webPort, () =>
    logger.info(`Web server running at http://localhost:${webPort}`)
)
