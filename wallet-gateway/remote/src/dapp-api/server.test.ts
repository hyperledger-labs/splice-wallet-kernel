// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, test, vi } from 'vitest'

import cors from 'cors'
import request from 'supertest'
import express from 'express'
import { dapp } from './server.js'
import { StoreInternal } from '@canton-network/core-wallet-store-inmemory'
import { ConfigUtils, deriveUrls } from '../config/ConfigUtils.js'
import { NotificationService } from '@canton-network/core-wallet-services'
import { pino } from 'pino'
import { sink } from 'pino-test'
import { createServer } from 'http'
import { getLogger } from '@logtape/logtape'

const configPath = '../test/config.json'
const config = ConfigUtils.loadConfigFile(configPath)

const store = new StoreInternal(config.bootstrap, getLogger('mock'))

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
            store,
            { signingDrivers: {} },
            'HASHING_SCHEME_VERSION_V3'
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

test('streams session & user notifications over SSE until logout', async () => {
    const context = { userId: 'sse-user', accessToken: 'sse-token' }
    await store.withAuthContext(context).setSession({
        id: 'sse-session',
        origin: 'http://localhost:8080',
        network: 'network',
        accessToken: context.accessToken,
    })
    const service = new NotificationService(pino(sink()))

    const app = express()
    app.use((req, _res, next) => {
        req.authContext = context
        next()
    })
    const server = createServer(app)
    const { dappApiUrl, publicUrl } = deriveUrls(config)
    dapp(
        '/api/v0/dapp',
        app,
        pino(sink()),
        server,
        config.kernel,
        dappApiUrl,
        publicUrl,
        config.server,
        service,
        store,
        { signingDrivers: {} },
        'HASHING_SCHEME_VERSION_V3'
    )

    const sessionNotifier = service.getNotifier('sse-session')
    const userNotifier = service.getNotifier('sse-user')

    // supertest only fires the request once awaited/then-ed
    const response = request(app)
        .get('/api/v0/dapp/events')
        .then((res) => res)

    // `emit` returns true once the SSE client has subscribed
    await vi.waitFor(() =>
        expect(sessionNotifier.emit('connected', { c: 1 })).toBe(true)
    )
    sessionNotifier.emit('txChanged', { status: 'pending' })
    userNotifier.emit('accountsChanged', [{ partyId: 'p' }])
    service.getNotifier('other-session').emit('txChanged', { other: true })
    sessionNotifier.emit('logout')

    const res = await response
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('text/event-stream')
    expect(res.text).toBe(
        'event: connected\ndata: [{"c":1}]\n\n' +
            'event: txChanged\ndata: [{"status":"pending"}]\n\n' +
            'event: accountsChanged\ndata: [[{"partyId":"p"}]]\n\n'
    )

    // subscription was torn down on logout
    expect(sessionNotifier.emit('txChanged', {})).toBe(false)
    expect(userNotifier.emit('accountsChanged', [])).toBe(false)
})
