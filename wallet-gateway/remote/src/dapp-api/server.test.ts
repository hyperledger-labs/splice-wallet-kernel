// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from '@jest/globals'

import cors from 'cors'
import request from 'supertest'
import express from 'express'
import { dapp } from './server.js'
import { StoreInternal } from '@canton-network/core-wallet-store-inmemory'
import { AuthService } from '@canton-network/core-wallet-auth'
import { ConfigUtils, deriveUrls } from '../config/ConfigUtils.js'
import { NotificationService } from '../notification/NotificationService.js'
import { pino } from 'pino'
import { sink } from 'pino-test'
import { createServer } from 'http'

const authService: AuthService = {
    verifyToken: async () => {
        return new Promise((resolve) =>
            resolve({ userId: 'user123', accessToken: 'token123' })
        )
    },
}

const configPath = '../test/config.json'
const config = ConfigUtils.loadConfigFile(configPath)

const store = new StoreInternal(config.bootstrap, pino(sink()))

const notificationService = new NotificationService(pino(sink()))

test('call connect rpc', async () => {
    const app = express()
    app.use(cors())
    app.use(express.json())
    const server = createServer(app)
    const { dappApiUrl, publicUrl } = deriveUrls(config)
    const response = await request(
        dapp(
            '/api/v0/dapp',
            app,
            pino(sink()),
            server,
            config.kernel,
            dappApiUrl,
            publicUrl,
            config.server,
            notificationService,
            authService,
            store
        )
    )
        .post('/api/v0/dapp')
        .send({ jsonrpc: '2.0', id: 0, method: 'connect', params: [] })
        .set('Accept', 'application/json')

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({
        id: 0,
        jsonrpc: '2.0',
        result: {
            isConnected: false,
            isNetworkConnected: false,
            networkReason: 'Unauthenticated',
            userUrl: 'http://localhost:3030/login/',
        },
    })
})
