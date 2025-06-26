import express from 'express'
import { fileURLToPath } from 'url'
import path from 'path'

export const web = express()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const mainApp = path.resolve(__dirname, './frontend/dist/app')
const loginDir = path.resolve(__dirname, './frontend/dist/login')
const callback = path.resolve(__dirname, './frontend/dist/callback')

web.use('/', express.static(mainApp))
web.use('/login', express.static(loginDir))
web.use('/callback', express.static(callback))
