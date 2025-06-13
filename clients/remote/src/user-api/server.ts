import express from 'express'
import { userController } from './controller.js'
import { pino } from 'pino'
import { jsonRpcHttpMiddleware } from '../jsonrpc-http-middleware.js'
import { Methods } from './rpc-gen/index.js'

const logger = pino({ name: 'main', level: 'debug' })

export const user = express()

user.use(express.json())
user.use(
    '/rpc',
    jsonRpcHttpMiddleware<Methods>({ controller: userController, logger })
)
