import { expect, test } from '@jest/globals'

import request from 'supertest'
import { dapp } from './server.js'
import { StoreInternal, StoreInternalConfig } from 'core-wallet-store'
import { AuthService } from 'core-wallet-auth'

const authService: AuthService = {
    connected: () => true,
    getUserId: () => 'test-user-id',
}

const config: StoreInternalConfig = {
    networks: [],
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
