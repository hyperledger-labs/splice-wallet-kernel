import { dapp } from './dapp-api/server.js'
import { user } from './user-api/server.js'
import { web } from './web/server.js'
import { pino } from 'pino'

const dAppPort = 3000
const userPort = 3001
const webPort = 3002

const logger = pino({ name: 'main', level: 'debug' })

export const dAppServer = dapp.listen(dAppPort, () => {
    logger.info(`dApp Server running at http://localhost:${dAppPort}`)
})

export const userServer = user.listen(userPort, () => {
    logger.info(`User Server running at http://localhost:${userPort}`)
})

export const webServer = web.listen(webPort, () => {
    logger.info(`Web server running at http://localhost:${webPort}`)
})
