// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    vi,
    describe,
    it,
    expect,
    beforeEach,
    type MockedFunction,
    afterEach,
} from 'vitest'
import {
    ClientCredentialsService,
    clientCredentialsService,
} from './client-credentials-service.js'
import type { ClientCredentials } from './auth-service.js'
import { configure, reset } from '@logtape/logtape'
import { createLogRecorder } from '@logtape/testing/recorder'

const recorder = createLogRecorder()
const category = ['core', 'wallet-auth', 'client-credentials-service']

describe('ClientCredentialsService', () => {
    const configUrl = 'http://idp/.well-known/openid-configuration'
    const credentials: ClientCredentials = {
        audience: 'aud',
        scope: 'scope',
        clientId: 'cid',
        clientSecret: 'secret',
    }

    let service: ClientCredentialsService
    let getOIDCConfigSpy: MockedFunction<
        (url: string) => Promise<{ token_endpoint: string }>
    >
    let fetchTokenEndpointSpy: MockedFunction<
        (
            tokenEndpoint: string,
            credentials: ClientCredentials
        ) => Promise<Response>
    >

    const fetchMock = vi.fn()
    beforeEach(async () => {
        await configure({
            sinks: { recorder: recorder.sink },
            loggers: [
                {
                    category: ['core'],
                    lowestLevel: 'debug',
                    sinks: ['recorder'],
                },
                { category: ['logtape', 'meta'], sinks: [] },
            ],
        })
        vi.stubGlobal('fetch', fetchMock)
        service = new ClientCredentialsService(configUrl)
        getOIDCConfigSpy = vi.spyOn(service, 'getOIDCConfig')
        fetchTokenEndpointSpy = vi.spyOn(service, 'fetchTokenEndpoint')
    })

    afterEach(async () => {
        vi.restoreAllMocks()
        fetchMock.mockReset()
        vi.unstubAllGlobals()
        recorder.clear()
        await reset()
    })

    it('returns access_token on success', async () => {
        getOIDCConfigSpy.mockResolvedValue({
            token_endpoint: 'http://idp/token',
        })
        fetchTokenEndpointSpy.mockResolvedValue({
            ok: true,
            json: vi.fn<() => Promise<unknown>>().mockResolvedValue({
                access_token: 'jwt',
            }),
        } as unknown as Response)

        const token = await service.fetchToken(credentials)
        expect(token).toBe('jwt')
    })

    it('throws if OIDC config fetch fails', async () => {
        getOIDCConfigSpy.mockRejectedValue(new Error('config fail'))
        await expect(service.fetchToken(credentials)).rejects.toThrow(
            'config fail'
        )
    })

    it('throws if token endpoint fetch fails', async () => {
        getOIDCConfigSpy.mockResolvedValue({
            token_endpoint: 'http://idp/token',
        })
        fetchTokenEndpointSpy.mockRejectedValue(new Error('token fail'))

        await expect(service.fetchToken(credentials)).rejects.toThrow(
            'token fail'
        )
    })

    it('throws if access_token missing', async () => {
        getOIDCConfigSpy.mockResolvedValue({
            token_endpoint: 'http://idp/token',
        })
        fetchTokenEndpointSpy.mockResolvedValue({
            ok: true,
            json: vi.fn<() => Promise<unknown>>().mockResolvedValue({}),
        } as unknown as Response)

        await expect(service.fetchToken(credentials)).rejects.toThrow(
            'Invalid token endpoint response'
        )
    })

    it('throws if access_token is empty', async () => {
        getOIDCConfigSpy.mockResolvedValue({
            token_endpoint: 'http://idp/token',
        })
        fetchTokenEndpointSpy.mockResolvedValue({
            ok: true,
            json: vi
                .fn<() => Promise<unknown>>()
                .mockResolvedValue({ access_token: '' }),
        } as unknown as Response)

        await expect(service.fetchToken(credentials)).rejects.toThrow(
            'Invalid token endpoint response'
        )
    })

    it('getOIDCConfig', async () => {
        const mockData = { token_endpoint: 'http://idp/token' }

        fetchMock.mockImplementation(() => {
            return Promise.resolve({
                ok: true,
                json: async () => mockData,
            })
        })

        const result = await service.getOIDCConfig(
            'http://idp/.well-known/openid-configuration'
        )

        expect(result).toStrictEqual(mockData)
    })

    it('getOIDCConfig should throw an error if fetch fails', async () => {
        const mockData = { token_endpoint: 'http://idp/token' }
        fetchMock.mockImplementation(() => {
            return Promise.resolve({
                ok: false,
                status: 'Failed',
                statusText: 'fetch request failed',
                text: async () => 'error text here',
                json: async () => mockData,
            })
        })

        await expect(
            service.getOIDCConfig('http://idp/.well-known/openid-configuration')
        ).rejects.toThrow(
            `Failed to fetch OIDC discovery document: Failed fetch request failed`
        )
    })

    it('rejects discovery without a token endpoint', async () => {
        fetchMock.mockResolvedValue(Response.json({}))

        await expect(service.getOIDCConfig(configUrl)).rejects.toThrow(
            'OIDC config has no token_endpoint'
        )
    })

    it('fetches a token through the service factory with optional credentials omitted', async () => {
        fetchMock
            .mockResolvedValueOnce(
                Response.json({ token_endpoint: 'http://idp/token' })
            )
            .mockResolvedValueOnce(Response.json({ access_token: 'jwt' }))

        await expect(
            clientCredentialsService(configUrl).fetchToken({
                ...credentials,
                scope: undefined,
                audience: undefined,
            })
        ).resolves.toBe('jwt')
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            'http://idp/token',
            expect.objectContaining({
                body: 'grant_type=client_credentials&scope=&audience=',
            })
        )
        recorder.assertLogged({
            category,
            level: 'debug',
            rawMessage: 'Fetched admin token for clientId: {clientId}',
            properties: { clientId: 'cid', configUrl },
        })
    })

    it('logs and propagates discovery failures through the service factory', async () => {
        fetchMock.mockRejectedValue(new TypeError('fetch failed'))

        await expect(
            clientCredentialsService(configUrl).fetchToken(credentials)
        ).rejects.toThrow(
            'Failed to fetch OIDC discovery document: fetch failed'
        )
        recorder.assertLogged({
            category,
            level: 'error',
            message: 'Failed to fetch OIDC config',
            properties: (props) => props.error instanceof Error,
        })
        recorder.assertLogged({
            category,
            level: 'warning',
            message: 'Failed to fetch admin token',
            properties: (props) => props.error instanceof Error,
        })
    })

    it('fetchTokenEndpoint', async () => {
        const mockData = { access_token: 'jwt' }
        fetchMock.mockImplementation(() => {
            return Promise.resolve({
                ok: true,
                json: async () => mockData,
            })
        })

        const result = await service.fetchTokenEndpoint(
            'http://idp/token',
            credentials
        )

        const params = 'grant_type=client_credentials&scope=scope&audience=aud'
        expect(fetch).toHaveBeenCalledWith('http://idp/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
                Authorization: `Basic ${btoa('cid:secret')}`,
            },
            body: params,
        })

        const json = await result.json()
        expect(json).toStrictEqual(mockData)
    })

    it('fetchTokenEndpoint should fail with bad fetch response', async () => {
        const mockData = { access_token: 'jwt' }
        fetchMock.mockImplementation(() => {
            return Promise.resolve({
                ok: false,
                status: 'Failed',
                statusText: 'fetch request failed',
                text: async () => 'error text here',
                json: async () => mockData,
            })
        })

        await expect(
            service.fetchTokenEndpoint('http://idp/token', credentials)
        ).rejects.toThrow(`Token endpoint error: Failed fetch request failed`)
    })
})
