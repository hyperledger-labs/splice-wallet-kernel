import { dapp } from './dapp-api/server.js'
import { user } from './user-api/server.js'
import { web } from './web/server.js'
import { pino } from 'pino'
import ViteExpress from 'vite-express'
import { AuthService } from 'core-wallet-auth'
import { StoreInternal, StoreInternalConfig } from 'core-wallet-store'
import { ConfigUtils } from './config/ConfigUtils.js'
import * as schemas from './config/StoreConfig.js'

const dAppPort = 3000
const userPort = 3001
const webPort = 3002

const logger = pino({ name: 'main', level: 'debug' })

const authService: AuthService = {
    connected: () => true,
    getUserId: () => 'test-user-id',
}

const networkConfigPath =
    process.env.NETWORK_CONFIG_PATH || '../test/multi-network-config.json'
const networks = ConfigUtils.loadConfigFile(networkConfigPath)
schemas.networksSchema.parse(networks)

const config: StoreInternalConfig = {
    networks: schemas.networksSchema.parse(networks),
}
const store = new StoreInternal(config, authService)

export const dAppServer = dapp(store).listen(dAppPort, () => {
    logger.info(`dApp Server running at http://localhost:${dAppPort}`)
})

export const userServer = user(store).listen(userPort, () => {
    logger.info(`User Server running at http://localhost:${userPort}`)
})

export const webServer = ViteExpress.listen(web, webPort, () =>
    logger.info(`Web server running at http://localhost:${webPort}`)
)
