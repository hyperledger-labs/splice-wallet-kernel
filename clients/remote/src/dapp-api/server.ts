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
import { NotificationService } from '../notification/NotificationService.js'
import { KernelInfo } from '../config/Config.js'

const logger = pino({ name: 'main', level: 'debug' })

export const dapp = (
    kernelInfo: KernelInfo,
    ledgerClient: LedgerClient,
    notificationService: NotificationService,
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
                    kernelInfo,
                    store.withAuthContext(req.authContext),
                    notificationService,
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

    io.on('connection', (socket) => {
        logger.info('Socket.io client connected')

        authService
            .verifyToken(socket.handshake.auth.token)
            .then((authContext) => {
                const userId = authContext?.userId

                if (!userId) {
                    return
                }

                const notifier = notificationService.getNotifier(userId)

                notifier.on('accountsChanged', (wallets) => {
                    socket.emit('accountsChanged', wallets)
                })

                notifier.on('txChanged', (txChanged) => {
                    socket.emit('txChanged', txChanged)
                })

                notifier.on('onConnected', (event) => {
                    socket.emit('onConnected', event)
                })
            })

        socket.on('disconnect', () => {
            logger.info('Socket.io client disconnected')
        })
    })

    return server
}
