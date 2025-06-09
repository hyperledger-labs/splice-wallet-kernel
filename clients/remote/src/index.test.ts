import { afterAll, expect, test } from '@jest/globals'

import request from 'supertest'
import server from './index.js'

test('hello world', async () => {
    const response = await request(server).get('/api/hello')

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ message: 'Hello, world!' })
})

afterAll(() => {
    server.close()
})
