import express from 'express'
import { dappController } from './dapp-api/controller.js'
import { jsonRpcHttpMiddleware } from './jsonrpc-http-middleware.js'
import { pino } from 'pino'

const app = express()
const port = 3000

const logger = pino({ name: 'main', level: 'debug' })

app.use(express.json())
app.use('/rpc', jsonRpcHttpMiddleware({ controller: dappController, logger }))

app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello, world!' })
})

const server = app.listen(port, () => {
    logger.info(`Server running at http://localhost:${port}`)
})

export default server
