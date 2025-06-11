import express from 'express'
import { dappController } from './dapp-api/controller.js'
import { userController } from './user-api/controller.js'
import { jsonRpcHttpMiddleware } from './jsonrpc-http-middleware.js'
import { pino } from 'pino'
import { Methods as DappMethods } from './dapp-api/rpc-gen/index.js'
import { Methods as UserMethods } from './user-api/rpc-gen/index.js'

const dAppPort = 3000
const userPort = 3001

const logger = pino({ name: 'main', level: 'debug' })

const dapp = express()
dapp.use(express.json())
dapp.use(
    '/rpc',
    jsonRpcHttpMiddleware<DappMethods>({ controller: dappController, logger })
)
dapp.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello, world!' })
})

export const dAppServer = dapp.listen(dAppPort, () => {
    logger.info(`dApp Server running at http://localhost:${dAppPort}`)
})

const user = express()
user.use(express.json())
user.use(
    '/rpc',
    jsonRpcHttpMiddleware<UserMethods>({ controller: userController, logger })
)
user.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello, world!' })
})

export const userServer = user.listen(userPort, () => {
    logger.info(`User Server running at http://localhost:${userPort}`)
})
