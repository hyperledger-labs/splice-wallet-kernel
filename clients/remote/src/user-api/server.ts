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
import { NotificationService } from '../notification/NotificationService.js'
import { KernelInfo } from '../config/Config.js'
import { SigningDriverInterface, SigningProvider } from 'core-signing-lib'

const logger = pino({ name: 'main', level: 'debug' })

export const user = (
    kernelInfo: KernelInfo,
    ledgerClient: LedgerClient,
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
                    ledgerClient,
                    drivers,
                    logger
                ),
                logger,
            })(req, res, next)
    )

    return user
}
