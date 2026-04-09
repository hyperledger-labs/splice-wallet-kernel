// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as http from 'node:http'
import { handleMockJsonRpc, MOCK_DAPP_API_PATH } from './json-rpc-handlers.ts'

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
} as const

function sendJson(
    res: http.ServerResponse,
    status: number,
    body: unknown
): void {
    res.writeHead(status, {
        ...cors,
        'Content-Type': 'application/json; charset=utf-8',
    })
    res.end(JSON.stringify(body))
}

export function startMockRemoteGateway(port: number): Promise<{
    rpcBase: string
    server: http.Server
}> {
    const host = '127.0.0.1'
    const rpcBase = `http://${host}:${port}${MOCK_DAPP_API_PATH}`

    const server = http.createServer((req, res) => {
        if (req.method === 'OPTIONS') {
            res.writeHead(204, { ...cors })
            res.end()
            return
        }

        const url = new URL(req.url ?? '/', `http://${host}:${port}`)

        if (req.method === 'POST' && url.pathname === MOCK_DAPP_API_PATH) {
            const chunks: Buffer[] = []
            req.on('data', (c) => chunks.push(c))
            req.on('end', () => {
                try {
                    const raw = Buffer.concat(chunks).toString('utf8')
                    const body = JSON.parse(raw) as {
                        id: string | number | null
                        method: string
                        params?: unknown
                    }
                    const { status, json } = handleMockJsonRpc(rpcBase, body)
                    sendJson(res, status, json)
                } catch {
                    sendJson(res, 400, {
                        jsonrpc: '2.0',
                        id: null,
                        error: { code: -32700, message: 'Parse error' },
                    })
                }
            })
            return
        }

        if (
            req.method === 'GET' &&
            url.pathname === `${MOCK_DAPP_API_PATH}/events`
        ) {
            res.writeHead(200, {
                ...cors,
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            })
            res.write(':ok\n\n')
            const keepAlive = setInterval(() => {
                res.write(':ok\n\n')
            }, 15000)
            req.on('close', () => {
                clearInterval(keepAlive)
            })
            return
        }

        res.writeHead(404, { ...cors, 'Content-Type': 'text/plain' })
        res.end('not found')
    })

    return new Promise((resolve, reject) => {
        server.once('error', reject)
        server.listen(port, host, () => {
            resolve({ rpcBase, server })
        })
    })
}
