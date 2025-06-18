import { dapp } from './dapp-api/server.js'
import { user } from './user-api/server.js'
import { web } from './web/server.js'
import { pino } from 'pino'
import { AuthService } from 'core-wallet-auth'
import { StoreInternal, StoreInternalConfig } from 'core-wallet-store'

const dAppPort = 3000
const userPort = 3001
const webPort = 3002

const logger = pino({ name: 'main', level: 'debug' })

const authService: AuthService = {
    connected: () => true,
    getUserId: () => 'test-user-id',
}

const config: StoreInternalConfig = {
    networks: [],
}
const store = new StoreInternal(config, authService)

export const dAppServer = dapp(store).listen(dAppPort, () => {
    logger.info(`dApp Server running at http://localhost:${dAppPort}`)
})

export const userServer = user(store).listen(userPort, () => {
    logger.info(`User Server running at http://localhost:${userPort}`)
})

export const webServer = web.listen(webPort, () => {
    logger.info(`Web server running at http://localhost:${webPort}`)
})
