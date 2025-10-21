// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, jest, test } from '@jest/globals'

import cors from 'cors'
import express from 'express'
import request from 'supertest'
import { user } from './server.js'
import { StoreInternal } from '@canton-network/core-wallet-store-inmemory'
import { ConfigUtils } from '../config/ConfigUtils.js'
import { Notifier } from '../notification/NotificationService.js'
import { pino } from 'pino'
import { sink } from 'pino-test'

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

test('call listNetworks rpc', async () => {
    const drivers = {}
    const app = express()
    app.use(cors())
    app.use(express.json())

    const response = await request(
        user(
            '/api/v0/user',
            app,
            config.kernel,
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
    expect(json.networks.length).toBe(4)
    expect(json.networks[0].name).toBe('Local (password IDP)')
    expect(json.networks[1].name).toBe('Local (OAuth IDP)')
    expect(json.networks[2].name).toBe('Local (OAuth IDP - Client Credentials)')
    expect(json.networks[3].name).toBe('Devnet (Auth0)')
})
