import express from 'express'
import { userController } from './controller.js'
import { pino } from 'pino'
import { jsonRpcHandler } from '../middleware/jsonRpcHandler.js'
import { Methods } from './rpc-gen/index.js'
import { Store } from 'core-wallet-store'
import { AuthService, AuthAware } from 'core-wallet-auth'
import { jwtAuth } from '../middleware/jwtAuth.js'
import { rpcRateLimit } from '../middleware/rateLimit.js'
import cors from 'cors'
import {
    NotificationService,
    Notifier,
} from '../notification/NotificationService.js'
import { KernelInfo } from '../config/Config.js'
import { SigningDriverInterface, SigningProvider } from 'core-signing-lib'
import { createServer } from 'http'
import { Server } from 'socket.io'

const logger = pino({ name: 'main', level: 'debug' })

export const user = (
    kernelInfo: KernelInfo,
    notificationService: NotificationService,
    authService: AuthService,
    drivers: Partial<Record<SigningProvider, SigningDriverInterface>>,
    store: Store & AuthAware<Store>
) => {
    const user = express()
    user.use(cors())
    user.use(express.json())
    user.use(
        '/rpc',
        rpcRateLimit,
        jwtAuth(authService, logger),
        (req, res, next) =>
            jsonRpcHandler<Methods>({
                controller: userController(
                    kernelInfo,
                    store.withAuthContext(req.authContext),
                    notificationService,
                    req.authContext,
                    drivers,
                    logger
                ),
                logger,
            })(req, res, next)
    )

    const server = createServer(user)
    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    })

    io.on('connection', (socket) => {
        logger.info('Socket.io client connected')

        let notifier: Notifier | undefined = undefined

        const onAccountsChanged = (...event: unknown[]) => {
            io.emit('accountsChanged', ...event)
        }
        const onConnected = (...event: unknown[]) => {
            io.emit('onConnected', ...event)
        }
        const onTxChanged = (...event: unknown[]) => {
            io.emit('txChanged', ...event)
        }

        authService
            .verifyToken(socket.handshake.auth.token)
            .then((authContext) => {
                const userId = authContext?.userId

                if (!userId) {
                    return
                }

                notifier = notificationService.getNotifier(userId)

                notifier.on('accountsChanged', onAccountsChanged)
                notifier.on('onConnected', onConnected)
                notifier.on('txChanged', onTxChanged)
            })

        socket.on('disconnect', () => {
            logger.info('Socket.io client disconnected')

            if (notifier) {
                notifier.removeListener('accountsChanged', onAccountsChanged)
                notifier.removeListener('onConnected', onConnected)
                notifier.removeListener('txChanged', onTxChanged)
            }
        })
    })

    return server
}
