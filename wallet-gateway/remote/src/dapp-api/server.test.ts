// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, test, jest } from '@jest/globals'

import cors from 'cors'
import request from 'supertest'
import express from 'express'
import { dapp } from './server.js'
import { StoreInternal } from '@canton-network/core-wallet-store-inmemory'
import { AuthService } from '@canton-network/core-wallet-auth'
import { ConfigUtils } from '../config/ConfigUtils.js'
import { Notifier } from '../notification/NotificationService.js'
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

const store = new StoreInternal(config.store, pino(sink()))

const notificationService = {
    getNotifier: jest.fn<() => Notifier>().mockReturnValue({
        on: jest.fn(),
        emit: jest.fn<Notifier['emit']>(),
        removeListener: jest.fn(),
    }),
}

test('call connect rpc', async () => {
    const app = express()
    app.use(cors())
    app.use(express.json())
    const server = createServer(app)
    const response = await request(
        dapp(
            '/api/v0/dapp',
            app,
            pino(sink()),
            server,
            config.kernel,
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
            sessionToken: '',
            status: {
                kernel: {
                    id: 'remote-da',
                    clientType: 'remote',
                    url: 'http://localhost:3030/api/v0/dapp',
                    userUrl: 'http://localhost:3030',
                },
                isConnected: false,
                userUrl: 'http://localhost:3030/login/',
            },
        },
    })
})
