import { jest } from '@jest/globals'
import {
    ClientCredentials,
    ClientCredentialsService,
    OIDCConfig,
} from './client-credentials-service.js'

describe('ClientCredentialsService', () => {
    const configUrl = 'http://idp/.well-known/openid-configuration'
    const credentials: ClientCredentials = {
        audience: 'aud',
        scope: 'scope',
        clientId: 'cid',
        clientSecret: 'secret',
    }

    let service: ClientCredentialsService
    let getOIDCConfigSpy: jest.SpiedFunction<
        (url: string) => Promise<OIDCConfig>
    >
    let fetchTokenEndpointSpy: jest.SpiedFunction<
        (
            tokenEndpoint: string,
            credentials: ClientCredentials
        ) => Promise<Response>
    >

    beforeEach(() => {
        service = new ClientCredentialsService(configUrl, undefined)
        getOIDCConfigSpy = jest.spyOn(service, 'getOIDCConfig')
        fetchTokenEndpointSpy = jest.spyOn(service, 'fetchTokenEndpoint')
    })

    it('returns access_token on success', async () => {
        getOIDCConfigSpy.mockResolvedValue({
            token_endpoint: 'http://idp/token',
        })
        fetchTokenEndpointSpy.mockResolvedValue({
            ok: true,
            json: jest
                .fn<() => Promise<unknown>>()
                .mockResolvedValue({ access_token: 'jwt' }),
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
            json: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
        } as unknown as Response)

        await expect(service.fetchToken(credentials)).rejects.toThrow(
            'No access_token in token endpoint response'
        )
    })
})
