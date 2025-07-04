import { expect, jest, test } from '@jest/globals'

import request from 'supertest'
import { user } from './server.js'
import { StoreInternal, StoreInternalConfig } from 'core-wallet-store'
import { AuthService } from 'core-wallet-auth'
import { ConfigUtils } from '../config/ConfigUtils.js'
import * as schemas from '../config/StoreConfig.js'
import { LedgerClient } from 'core-ledger-client'

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

test('call connect rpc', async () => {
    const response = await request(user(ledgerClient, authService, store))
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
