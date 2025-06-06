import { expect, test } from '@jest/globals'

import request from 'supertest'
import app from './index.js'

test('hello world', async () => {
    request(app)
        .get('/api/hello')
        .expect(200)
        .then((response) => {
            expect(response.body).toEqual({ message: 'Hello, world!' })
        })
})
