import { WebSocketServer, WebSocket } from 'ws'

const wss = new WebSocketServer({ port: 8080 })

wss.on('connection', (ws) => {
    console.log('Client connected')

    ws.on('message', (message) => {
        console.log(`Received: ${message}`)
        ws.send(`Server received: ${message}`)
    })

    ws.on('close', () => {
        console.log('Client disconnected')
    })

    ws.on('error', (error) => {
        console.error('WebSocket error:', error)
    })
})

console.log('WebSocket server started on port 8080')
