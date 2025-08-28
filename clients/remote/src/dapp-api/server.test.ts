import { expect, test, jest } from '@jest/globals'

import request from 'supertest'
import { dapp } from './server.js'
import { StoreInternal } from '@canton-network/core-wallet-store-inmemory'
import { AuthService } from '@canton-network/core-wallet-auth'
import { ConfigUtils } from '../config/ConfigUtils.js'
import { Notifier } from '../notification/NotificationService.js'
import { configSchema } from '../config/Config.js'
import { pino } from 'pino'
import { sink } from 'pino-test'

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
const store = new StoreInternal(config.store, pino(sink()))

const notificationService = {
    getNotifier: jest.fn<() => Notifier>().mockReturnValue({
        on: jest.fn(),
        emit: jest.fn<Notifier['emit']>(),
        removeListener: jest.fn(),
    }),
}

test('call connect rpc', async () => {
    const response = await request(
        dapp(config.kernel, notificationService, authService, store)
    )
        .post('/rpc')
        .send({ jsonrpc: '2.0', id: 0, method: 'connect', params: [] })
        .set('Accept', 'application/json')

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({
        id: 0,
        jsonrpc: '2.0',
        result: {
            kernel: {
                id: 'remote-da',
                clientType: 'remote',
                url: 'http://localhost:3000/rpc',
            },
            isConnected: false,
            userUrl: 'http://localhost:3002/login/',
        },
    })
})
