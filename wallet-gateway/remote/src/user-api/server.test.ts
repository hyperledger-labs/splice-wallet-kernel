// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from '@jest/globals'

import cors from 'cors'
import express from 'express'
import request from 'supertest'
import { user } from './server.js'
import { StoreInternal } from '@canton-network/core-wallet-store-inmemory'
import { Network } from '@canton-network/core-wallet-store'
import { ConfigUtils, deriveUrls } from '../config/ConfigUtils.js'
import { NotificationService } from '../notification/NotificationService.js'
import { pino } from 'pino'
import { sink } from 'pino-test'

const configPath = '../test/config.json'
const config = ConfigUtils.loadConfigFile(configPath)

const store = new StoreInternal(config.store, pino(sink()))

const notificationService = new NotificationService(pino(sink()))

test('call listNetworks rpc', async () => {
    const drivers = {}
    const app = express()
    app.use(cors())
    app.use(express.json())

    const { publicUrl } = deriveUrls(config)
    const response = await request(
        user(
            '/api/v0/user',
            app,
            pino(sink()),
            config.kernel,
            publicUrl,
            notificationService,
            drivers,
            store
        )
    )
        .post('/api/v0/user')
        .send({ jsonrpc: '2.0', id: 0, method: 'listNetworks', params: [] })
        .set('Accept', 'application/json')

    const json = await response.body.result

    expect(response.statusCode).toBe(200)
    expect(json.networks.length).toBe(6)
    expect(json.networks.map((n: Network) => n.name)).toStrictEqual([
        'Local (OAuth IDP)',
        'Local (OAuth IDP - 2)',
        'Local (OAuth IDP - Client Credentials)',
        'Local (Self signed)',
        'Devnet (Auth0)',
        'LocalNet',
    ])
})
