import express from 'express'
import { dappController } from './controller.js'
import { pino } from 'pino'
import { jsonRpcHttpMiddleware } from '../jsonrpc-http-middleware.js'
import { Methods } from './rpc-gen/index.js'

const logger = pino({ name: 'main', level: 'debug' })

export const dapp = express()

dapp.use(express.json())
dapp.use(
    '/rpc',
    jsonRpcHttpMiddleware<Methods>({ controller: dappController, logger })
)
