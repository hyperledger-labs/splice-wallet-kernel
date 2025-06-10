import { afterAll, expect, test } from '@jest/globals'

import request from 'supertest'
import { dAppServer } from './index.js'

test('hello world', async () => {
    const response = await request(dAppServer).get('/api/hello')

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ message: 'Hello, world!' })
})

afterAll(() => {
    dAppServer.close()
})
