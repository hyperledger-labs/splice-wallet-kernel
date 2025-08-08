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
import { NotificationService } from '../notification/NotificationService.js'
import { KernelInfo } from '../config/Config.js'

const logger = pino({ name: 'main', level: 'debug' })

export const dapp = (
    kernelInfo: KernelInfo,
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
                    req.authContext
                ),
                logger,
            })(req, res, next)
    )

    return app
}
