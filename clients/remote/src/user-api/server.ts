import express from 'express'
import { userController } from './controller.js'
import { pino } from 'pino'
import { jsonRpcHttpMiddleware } from '../jsonrpc-http-middleware.js'
import { Methods } from './rpc-gen/index.js'
import { Store } from 'core-wallet-store'
import { AuthService, AuthAware } from 'core-wallet-auth'
import { jwtAuth } from '../middleware/jwtAuth.js'
import { rpcRateLimit } from '../middleware/rateLimit.js'

const logger = pino({ name: 'main', level: 'debug' })

export const user = (
    authService: AuthService,
    store: Store & AuthAware<Store>
) => {
    const user = express()

    user.use(express.json())
    user.use(
        '/rpc',
        rpcRateLimit,
        jwtAuth(authService, logger),
        (req, res, next) =>
            jsonRpcHttpMiddleware<Methods>({
                controller: userController(
                    store.withAuthContext(req.authContext)
                ),
                logger,
            })(req, res, next)
    )

    return user
}
