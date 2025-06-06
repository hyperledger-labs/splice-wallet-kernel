import { NextFunction, Request, Response } from 'express'
// import { pino } from 'pino'

interface JsonRpcHttpOptions {
    controller: Record<string, (args: unknown) => Promise<unknown>>
}

// const logger = pino({ name: 'jsonRpcHttpMiddleware', level: 'debug' })

export const jsonRpcHttpMiddleware = ({ controller }: JsonRpcHttpOptions) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.method !== 'POST') {
            next()
        }

        const { id, method, params } = req.body

        console.log(
            `Received RPC request: method=${method}, params=${JSON.stringify(params)}`
        )

        const methodFn = controller[method]

        if (!methodFn) {
            console.error(`Method ${method} not found`)
            res.status(404).json({
                jsonrpc: '2.0',
                id,
                error: {
                    code: -32601,
                    message: `Method not found: ${method}`,
                },
            })
        }

        methodFn(params)
            .then((result) => {
                res.json({
                    jsonrpc: '2.0',
                    id,
                    result,
                })
            })
            .catch((error) => {
                console.error(`Error in method ${method}:`, error)
                res.status(500).json({
                    jsonrpc: '2.0',
                    id,
                    error: {
                        code: -32000,
                        message: 'Internal error',
                        data: error.message,
                    },
                })
            })
    }
}
