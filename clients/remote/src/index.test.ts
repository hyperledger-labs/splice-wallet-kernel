import { afterAll, expect, test } from '@jest/globals'

import request from 'supertest'
import { dAppServer } from './index.js'

test('call connect rpc', async () => {
    const response = await request(dAppServer)
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

beforeAll((done) => {
    done()
})

afterAll((done) => {
    dAppServer.close()
    done()
})
