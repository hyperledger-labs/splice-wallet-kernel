import { expect, test } from '@jest/globals'

import request from 'supertest'
import { dapp } from './server.js'

test('call connect rpc', async () => {
    const response = await request(dapp)
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
