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
import { ClientCredentialsService } from './client-credentials-service.js'
import type { ClientCredentials, OIDCConfig } from './auth-service.js'

describe('ClientCredentialsService', () => {
    const configUrl = 'http://idp/.well-known/openid-configuration'
    const credentials: ClientCredentials = {
        audience: 'aud',
        scope: 'scope',
        clientId: 'cid',
        clientSecret: 'secret',
    }

    let service: ClientCredentialsService
    let getOIDCConfigSpy: MockedFunction<(url: string) => Promise<OIDCConfig>>
    let fetchTokenEndpointSpy: MockedFunction<
        (
            tokenEndpoint: string,
            credentials: ClientCredentials
        ) => Promise<Response>
    >

    const fetchMock = vi.fn()
    beforeEach(() => {
        vi.stubGlobal('fetch', fetchMock)
        service = new ClientCredentialsService(configUrl)
        getOIDCConfigSpy = vi.spyOn(service, 'getOIDCConfig')
        fetchTokenEndpointSpy = vi.spyOn(service, 'fetchTokenEndpoint')
    })

    afterEach(() => {
        vi.restoreAllMocks()
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
            'No access_token in token endpoint response'
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
        ).rejects.toThrow(`OIDC config error: Failed fetch request failed`)
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
