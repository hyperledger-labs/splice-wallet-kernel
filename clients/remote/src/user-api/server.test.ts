import { expect, jest, test } from '@jest/globals'

import request from 'supertest'
import { user } from './server.js'
import { StoreInternal } from 'core-wallet-store'
import { AuthService } from 'core-wallet-auth'
import { ConfigUtils } from '../config/ConfigUtils.js'
import { LedgerClient } from 'core-ledger-client'
import { Notifier } from '../notification/NotificationService.js'
import { configSchema } from '../config/Config.js'

jest.mock('core-ledger-client')

const authService: AuthService = {
    verifyToken: async () => {
        return new Promise((resolve) =>
            resolve({ userId: 'user123', accessToken: 'token123' })
        )
    },
}

const configPath = process.env.NETWORK_CONFIG_PATH || '../test/config.json'
const configFile = ConfigUtils.loadConfigFile(configPath)
const config = configSchema.parse(configFile)

const store = new StoreInternal(config.store)
const ledgerClient = new LedgerClient('http://localhost:5003')

const notificationService = {
    getNotifier: jest.fn<() => Notifier>().mockReturnValue({
        on: jest.fn(),
        emit: jest.fn<Notifier['emit']>(),
        removeListener: jest.fn(),
    }),
}

test('call connect rpc', async () => {
    const response = await request(
        user(
            config.kernel,
            ledgerClient,
            notificationService,
            authService,
            store
        )
    )
        .post('/rpc')
        .send({ jsonrpc: '2.0', id: 0, method: 'listNetworks', params: [] })
        .set('Accept', 'application/json')

    expect(response.body).toEqual({
        jsonrpc: '2.0',
        id: 0,
        result: {
            networks: [
                {
                    name: 'Password Auth',
                    networkId: 'canton:local',
                    description: 'Unimplemented Password Auth',
                    ledgerApi: { baseUrl: 'https://test' },
                    auth: {
                        type: 'password',
                        tokenUrl: 'tokenUrl',
                        grantType: 'password',
                        scope: 'openid',
                        clientId: 'wk-service-account',
                    },
                },
                {
                    name: 'Mock OAuth Server',
                    networkId: 'canton:local',
                    description: 'Mock OAuth IDP',
                    ledgerApi: { baseUrl: 'https://test' },
                    auth: {
                        type: 'implicit',
                        domain: 'http://localhost:8082',
                        audience: 'test-audience',
                        scope: 'openid',
                        clientId: 'mock-oauth2-clientId',
                    },
                },
            ],
        },
    })
    expect(response.statusCode).toBe(200)
})
