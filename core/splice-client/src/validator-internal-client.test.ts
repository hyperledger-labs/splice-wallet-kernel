// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ValidatorInternalClient } from './validator-internal-client.js'
import {
    createAccessTokenProvider,
    getRequestHeaders,
    getRequestMethod,
    jsonResponse,
} from './test-utils.js'

const VALIDATOR_BASE_URL = new URL('https://validator.example/')

describe('ValidatorInternalClient', () => {
    let fetchMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
        fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('sends Authorization header on GET when access token is available', async () => {
        const accessTokenProvider = createAccessTokenProvider('validator-token')
        fetchMock.mockResolvedValue(jsonResponse({ status: 'ok' }))

        const client = new ValidatorInternalClient(
            VALIDATOR_BASE_URL,
            accessTokenProvider
        )
        await client.get('/readyz')

        expect(accessTokenProvider.getAccessToken).toHaveBeenCalledOnce()
        const headers = getRequestHeaders(fetchMock, '/readyz')
        expect(headers.authorization).toBe('Bearer validator-token')
        expect(headers['content-type']).toBe('application/json')
    })

    it('returns parsed GET response data', async () => {
        const responseBody = { status: 'ready' }
        fetchMock.mockResolvedValue(jsonResponse(responseBody))

        const client = new ValidatorInternalClient(
            VALIDATOR_BASE_URL,
            createAccessTokenProvider()
        )
        const result = await client.get('/readyz')

        expect(result).toEqual(responseBody)
    })

    it('returns parsed POST response data', async () => {
        const responseBody = { user_name: 'alice' }
        fetchMock.mockResolvedValue(jsonResponse(responseBody))

        const client = new ValidatorInternalClient(
            VALIDATOR_BASE_URL,
            createAccessTokenProvider()
        )
        const result = await client.post('/v0/register', {} as never)

        expect(result).toEqual(responseBody)
        expect(getRequestMethod(fetchMock, '/v0/register')).toBe('POST')
    })

    it('rejects when the API returns an error response', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({ message: 'unauthorized' }, 401)
        )

        const client = new ValidatorInternalClient(
            VALIDATOR_BASE_URL,
            createAccessTokenProvider()
        )

        await expect(client.get('/livez')).rejects.toBeDefined()
    })
})
