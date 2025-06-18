import express from 'express'
import { dappController } from './controller.js'
import { pino } from 'pino'
import { jsonRpcHttpMiddleware } from '../jsonrpc-http-middleware.js'
import { Methods } from './rpc-gen/index.js'
import { Store } from 'core-wallet-store'

const logger = pino({ name: 'main', level: 'debug' })

export const dapp = (store: Store) => {
    const app = express()

    app.use(express.json())
    app.use(
        '/rpc',
        jsonRpcHttpMiddleware<Methods>({
            controller: dappController(store),
            logger,
        })
    )

    return app
}
