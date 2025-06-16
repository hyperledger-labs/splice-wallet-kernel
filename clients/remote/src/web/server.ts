import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

export const web = express()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const publicDir = path.join(__dirname, 'public')

// Serve static files from the 'public' directory
web.use(express.static(publicDir))

web.get('/*any', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'))
})
