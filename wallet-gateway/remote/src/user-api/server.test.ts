// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import cors from 'cors'
import express from 'express'
import request from 'supertest'
import { user } from './server.js'
import { jwtAuthService } from '../auth/jwt-auth-service.js'
import { StoreInternal } from '@canton-network/core-wallet-store-inmemory'
import { ConfigUtils, deriveUrls } from '../config/ConfigUtils.js'
import { NotificationService } from '@canton-network/core-wallet-services'
import { pino } from 'pino'
import { sink } from 'pino-test'
import { getLogger } from '@logtape/logtape'

const configPath = '../test/config.json'
const config = ConfigUtils.loadConfigFile(configPath)

const store = new StoreInternal(config.bootstrap, getLogger('mock'))

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
            store,
            'HASHING_SCHEME_VERSION_V3'
        )
    )
        .post('/api/v0/user')
        .send({ jsonrpc: '2.0', id: 0, method: 'listNetworks', params: [] })
        .set('Accept', 'application/json')

    const json = await response.body.result

    expect(response.statusCode).toBe(200)
    expect(json.networks.length).toBe(7)
    expect(json.networks.map((n: { name: string }) => n.name)).toStrictEqual([
        'Local (OAuth IDP)',
        'Local (OAuth IDP - 2)',
        'Local (OAuth IDP - Client Credentials)',
        'Local (Self signed)',
        'Devnet (Auth0)',
        'LocalNet',
        'Local (Self issued)',
    ])

    for (const network of json.networks) {
        expect(network).not.toHaveProperty('auth')
        expect(network).not.toHaveProperty('adminAuth')
        expect(network).toHaveProperty('authMethod')
    }
})

test('selfSignedAccessToken rpc', async () => {
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
            store,
            'HASHING_SCHEME_VERSION_V3'
        )
    )
        .post('/api/v0/user')
        .send({
            jsonrpc: '2.0',
            id: 1,
            method: 'selfSignedAccessToken',
            params: {
                networkId: 'canton:local-self-signed',
                clientId: 'test-user',
                clientSecret: 'unsafe',
            },
        })
        .set('Accept', 'application/json')

    expect(response.statusCode).toBe(200)
    const { accessToken } = response.body.result
    expect(typeof accessToken).toBe('string')

    const payload = JSON.parse(
        Buffer.from(accessToken.split('.')[1], 'base64url').toString()
    )
    expect(payload.sub).toBe('test-user')
    expect(payload.iss).toBe('unsafe-auth')
})

test('selfSignedAccessToken token is accepted by jwt auth', async () => {
    const authService = jwtAuthService(store, pino(sink()))
    const app = express()
    app.use(cors())
    app.use(express.json())

    const { publicUrl } = deriveUrls(config)
    const mintResponse = await request(
        user(
            '/api/v0/user',
            app,
            pino(sink()),
            config.kernel,
            publicUrl,
            notificationService,
            {},
            store,
            'HASHING_SCHEME_VERSION_V3'
        )
    )
        .post('/api/v0/user')
        .send({
            jsonrpc: '2.0',
            id: 2,
            method: 'selfSignedAccessToken',
            params: {
                networkId: 'canton:local-self-signed',
                clientId: 'test-user',
                clientSecret: 'unsafe',
            },
        })

    const accessToken = mintResponse.body.result.accessToken
    const context = await authService.verifyToken(`Bearer ${accessToken}`)

    expect(context?.userId).toBe('test-user')
    expect(context?.accessToken).toBe(accessToken)
})

test('selfSignedAccessToken rpc rejects a mismatched client secret', async () => {
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
            {},
            store,
            'HASHING_SCHEME_VERSION_V3'
        )
    )
        .post('/api/v0/user')
        .send({
            jsonrpc: '2.0',
            id: 3,
            method: 'selfSignedAccessToken',
            params: {
                networkId: 'canton:local-self-signed',
                clientId: 'test-user',
                clientSecret: 'wrong-secret',
            },
        })
        .set('Accept', 'application/json')

    expect(response.statusCode).toBe(401)
    expect(response.body.result).toBeUndefined()
    expect(response.body.error).toBeDefined()
})
