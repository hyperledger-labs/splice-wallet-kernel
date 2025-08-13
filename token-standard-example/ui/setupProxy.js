const express = require('express')
const cors = require('cors')
const { createProxyMiddleware } = require('http-proxy-middleware')
const url = require('url')

const app = express()
app.use(cors())

const httpJsonDevUrl = 'http://127.0.0.1:7575'

app.use(
    createProxyMiddleware({
        target: httpJsonDevUrl,
        ws: true,
        changeOrigin: true,
        logger: console,
        on: {
            proxyReq: (proxyReq, req, res) => {
                const { query } = url.parse(req.url, true)
                if (query.access_token) {
                    console.log(
                        '[HTTP] Adding Authorization header from query param'
                    )
                    proxyReq.setHeader(
                        'Authorization',
                        `Bearer ${query.access_token}`
                    )
                }
            },
            proxyReqWs: (proxyReq, req, socket, options, head) => {
                const { query } = url.parse(req.url, true)
                if (query.access_token) {
                    console.log(
                        '[WS] Adding Authorization header from query param'
                    )
                    proxyReq.setHeader(
                        'Authorization',
                        `Bearer ${query.access_token}`
                    )
                }
                console.log(`[WS] Upgrade request for ${req.url}`)
            },
            open: (proxySocket) => {
                console.log('[WS] WebSocket connection opened to target')
            },
            close: (res, socket, head) => {
                console.log('[WS] WebSocket connection closed')
            },
            error: (err, req, res) => {
                console.error('[PROXY ERROR]', err)
            },
        },
    })
)

app.listen(8000, () => {
    console.log('Proxy running at http://localhost:8000')
})
