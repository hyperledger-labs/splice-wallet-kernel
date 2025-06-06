import express from 'express'
import { dappController } from './dapp-api/controller.js'
import { jsonRpcHttpMiddleware } from './jsonrpc-http-middleware.js'

const app = express()
const port = 3000

app.use(express.json())
app.use('/rpc', jsonRpcHttpMiddleware({ controller: dappController as any }))

app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello, world!' })
})

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
})
