import express from 'express'
import { dappController } from './dapp-api/controller'

const app = express()

const port = 3000

app.use(express.json())

app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello, world!' })
})

interface IJsonRpcRequest<T> {
    jsonrpc: string
    method: T
    params?: unknown[]
    id?: string | number
}

app.post('/rpc', async (req, res) => {
    // extremely naive JSON-RPC handler
    const { id, method, params } = req.body as IJsonRpcRequest<
        keyof typeof dappController
    >

    console.log(
        `Received RPC request: method=${method}, params=${JSON.stringify(params)}`
    )

    const methodFn = dappController[method]

    if (!methodFn) {
        // TODO: respond with JSON-RPC error
        console.error(`Method ${method} not found`)
    }

    const result = await methodFn(params as any)

    res.json({
        jsonrpc: '2.0',
        id,
        result,
    })
})

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
})
