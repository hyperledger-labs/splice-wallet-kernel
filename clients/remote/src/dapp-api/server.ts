import express from 'express'
import { dappController } from './controller.js'
import { pino } from 'pino'
import { jsonRpcHttpMiddleware } from '../jsonrpc-http-middleware.js'
import { Methods } from './rpc-gen/index.js'
import { Store } from 'core-wallet-store'
import { jwtAuth } from '../auth/jwtAuth.js'
import { AuthService, AuthAware } from 'core-wallet-auth'

const logger = pino({ name: 'main', level: 'debug' })

export const dapp = (
    authService: AuthService,
    store: Store & AuthAware<Store>
) => {
    const app = express()

    app.use(express.json())
    app.use('/rpc', jwtAuth(authService, logger), (req, res, next) =>
        jsonRpcHttpMiddleware<Methods>({
            controller: dappController(store.withAuthContext(req.authContext)),
            logger,
        })(req, res, next)
    )

    return app
}
