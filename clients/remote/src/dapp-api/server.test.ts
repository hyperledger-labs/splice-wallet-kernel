import { expect, test, jest } from '@jest/globals'

import request from 'supertest'
import { dapp } from './server.js'
import { StoreInternal, StoreInternalConfig } from 'core-wallet-store'
import { AuthService } from 'core-wallet-auth'
import { ConfigUtils } from '../config/ConfigUtils.js'
import * as schemas from '../config/StoreConfig.js'
import { LedgerClient } from 'core-ledger-client'
import { Notifier } from '../notification/NotificationService.js'

jest.mock('core-ledger-client')

const authService: AuthService = {
    verifyToken: async () => {
        return new Promise((resolve) => resolve({ userId: 'user123' }))
    },
}

const networkConfigPath =
    process.env.NETWORK_CONFIG_PATH || '../test/multi-network-config.json'

const network = schemas.networksSchema.parse(
    ConfigUtils.loadConfigFile(networkConfigPath)
)

const config: StoreInternalConfig = {
    networks: network,
}
const store = new StoreInternal(config)
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
        dapp(ledgerClient, notificationService, authService, store)
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
