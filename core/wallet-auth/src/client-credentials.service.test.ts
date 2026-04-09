// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    vi,
    describe,
    it,
    expect,
    beforeEach,
    type MockedFunction,
} from 'vitest'
import { ClientCredentialsService } from './client-credentials-service.js'
import { ClientCredentials, OIDCConfig } from './auth-service.js'

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

    beforeEach(() => {
        service = new ClientCredentialsService(configUrl, undefined)
        getOIDCConfigSpy = vi.spyOn(service, 'getOIDCConfig')
        fetchTokenEndpointSpy = vi.spyOn(service, 'fetchTokenEndpoint')
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
})
