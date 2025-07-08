import express from 'express'
import { dappController } from './controller.js'
import { pino } from 'pino'
import { jsonRpcHandler } from '../middleware/jsonRpcHandler.js'
import { Methods } from './rpc-gen/index.js'
import { Store } from 'core-wallet-store'
import { jwtAuth } from '../middleware/jwtAuth.js'
import { AuthService, AuthAware } from 'core-wallet-auth'
import { rpcRateLimit } from '../middleware/rateLimit.js'
import cors from 'cors'
import { LedgerClient } from 'core-ledger-client'

import { createServer } from 'http'
import { Server } from 'socket.io'

const logger = pino({ name: 'main', level: 'debug' })

export const dapp = (
    ledgerClient: LedgerClient,
    authService: AuthService,
    store: Store & AuthAware<Store>
) => {
    const app = express()
    app.use(cors())
    app.use(express.json())
    app.use(
        '/rpc',
        rpcRateLimit,
        jwtAuth(authService, logger),
        (req, res, next) =>
            jsonRpcHandler<Methods>({
                controller: dappController(
                    store.withAuthContext(req.authContext),
                    ledgerClient,
                    req.authContext
                ),
                logger,
            })(req, res, next)
    )

    const server = createServer(app)
    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    })

    store.getNotifier().on('accountsChanged', (data) => {
        logger.info('Accounts changed, emitting event')
        io.emit('accountsChanged', data)
    })

    return server
}
