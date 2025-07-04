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
import { LedgerClient } from 'core-ledger-client'

const logger = pino({ name: 'main', level: 'debug' })

export const user = (
    ledgerClient: LedgerClient,
    authService: AuthService,
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
                    store.withAuthContext(req.authContext),
                    ledgerClient
                ),
                logger,
            })(req, res, next)
    )

    return user
}
