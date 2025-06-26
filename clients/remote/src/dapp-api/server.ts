import express from 'express'
import { dappController } from './controller.js'
import { pino } from 'pino'
import { jsonRpcHttpMiddleware } from '../jsonrpc-http-middleware.js'
import { Methods } from './rpc-gen/index.js'
import { Store } from 'core-wallet-store'
import { jwtAuth } from '../middleware/jwtAuth.js'
import { AuthService, AuthAware } from 'core-wallet-auth'
import { rpcRateLimit } from '../middleware/rateLimit.js'
import cors from 'cors'

const logger = pino({ name: 'main', level: 'debug' })

export const dapp = (
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
            jsonRpcHttpMiddleware<Methods>({
                controller: dappController(
                    store.withAuthContext(req.authContext),
                    req.authContext
                ),
                logger,
            })(req, res, next)
    )

    return app
}
