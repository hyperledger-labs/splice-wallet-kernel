import { expect, test } from '@jest/globals'

import request from 'supertest'
import { dapp } from './server.js'
import { StoreInternal, StoreInternalConfig } from 'core-wallet-store'
import { AuthService } from 'core-wallet-auth'
import { ConfigUtils } from '../config/ConfigUtils.js'
import * as schemas from '../config/StoreConfig.js'

const authService: AuthService = {
    connected: () => true,
    getUserId: () => 'test-user-id',
}

const networkConfigPath =
    process.env.NETWORK_CONFIG_PATH || '../test/multi-network-config.json'

const network = schemas.networksSchema.parse(
    ConfigUtils.loadConfigFile(networkConfigPath)
)

const config: StoreInternalConfig = {
    networks: network,
}
const store = new StoreInternal(config, authService)

test('call connect rpc', async () => {
    const response = await request(dapp(store))
        .post('/rpc')
        .send({ jsonrpc: '2.0', id: 0, method: 'connect', params: [] })
        .set('Accept', 'application/json')

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({
        id: 0,
        jsonrpc: '2.0',
        result: {
            chainId: 'default-chain-id',
            userUrl: 'http://default-user-url.com',
        },
    })
})

test('call connect rpc', async () => {
    const response = await request(dapp(store))
        .post('/rpc')
        .send({ jsonrpc: '2.0', id: 0, method: 'listNetworks', params: [] })
        .set('Accept', 'application/json')

    expect(response.body).toEqual({
        jsonrpc: '2.0',
        id: 0,
        result: {
            networks: [
                {
                    name: 'xyz',
                    description: 'name1',
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
                    name: 'abc',
                    description: 'dex idp',
                    ledgerApi: { baseUrl: 'https://test' },
                    auth: {
                        type: 'implicit',
                        domain: 'dex.com',
                        audience: 'https://daml.com/jwt/aud/participant/wk-app',
                        scope: 'openid',
                        clientId: 'wk-service-account2',
                    },
                },
            ],
        },
    })
    // console.log(JSON.stringify(response.body))
    expect(response.statusCode).toBe(200)
})
