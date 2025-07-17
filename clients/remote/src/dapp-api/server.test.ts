import { expect, test, jest } from '@jest/globals'

import request from 'supertest'
import { dapp } from './server.js'
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

const ledgerClient = new LedgerClient('http://localhost:5003', () =>
    Promise.resolve('fake-token')
)

const notificationService = {
    getNotifier: jest.fn<() => Notifier>().mockReturnValue({
        on: jest.fn(),
        emit: jest.fn<Notifier['emit']>(),
        removeListener: jest.fn(),
    }),
}

test('call connect rpc', async () => {
    const response = await request(
        dapp(
            config.kernel,
            ledgerClient,
            notificationService,
            authService,
            store
        )
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
            chainId: 'default-chain-id',
            userUrl: 'http://localhost:3002/login/',
        },
    })
})
