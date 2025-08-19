import { jest } from '@jest/globals'
import { pino } from 'pino'
import { Auth, Network, Store } from 'core-wallet-store'
import { AdminAuthService, OIDCConfig } from './admin-auth-service.js'
import { sink } from 'pino-test'

describe('AdminAuthService', () => {
    const network: Network = {
        name: 'test',
        chainId: 'chain-id',
        synchronizerId: 'sync-id',
        description: 'desc',
        ledgerApi: {
            baseUrl: 'http://ledger',
            adminGrpcUrl: 'http://ledger/admin',
        },
        auth: {
            type: 'implicit',
            identityProviderId: 'idp2',
            issuer: 'http://idp',
            configUrl: 'http://idp/.well-known/openid-configuration',
            audience: 'aud',
            scope: 'scope',
            clientId: 'cid',
            admin: { clientId: 'cid', clientSecret: 'secret' },
        },
    }

    const mockStore: jest.Mocked<Store> = {
        getWallets: jest.fn(),
        getPrimaryWallet: jest.fn(),
        setPrimaryWallet: jest.fn(),
        addWallet: jest.fn(),

        getSession: jest.fn(),
        setSession: jest.fn(),
        removeSession: jest.fn(),

        getNetwork: jest.fn(),
        getCurrentNetwork: jest
            .fn<() => Promise<Network>>()
            .mockResolvedValue(network),
        listNetworks: jest.fn(),
        updateNetwork: jest.fn(),
        addNetwork: jest.fn(),
        removeNetwork: jest.fn(),

        setTransaction: jest.fn(),
        getTransaction: jest.fn(),
    }

    let service: AdminAuthService
    let getOIDCConfigSpy: jest.SpiedFunction<
        (url: string) => Promise<OIDCConfig>
    >
    let fetchAdminTokenSpy: jest.SpiedFunction<
        (tokenEndpoint: string, auth: Auth) => Promise<Response>
    >

    beforeEach(() => {
        const mockLogger = pino(sink())
        service = new AdminAuthService(mockStore, mockLogger)
        getOIDCConfigSpy = jest.spyOn(service, 'getOIDCConfig')
        fetchAdminTokenSpy = jest.spyOn(service, 'fetchAdminToken')
    })

    it('returns access_token on success', async () => {
        getOIDCConfigSpy.mockResolvedValue({
            token_endpoint: 'http://idp/token',
        })
        fetchAdminTokenSpy.mockResolvedValue({
            ok: true,
            json: jest
                .fn<() => Promise<unknown>>()
                .mockResolvedValue({ access_token: 'jwt' }),
        } as unknown as Response)

        const token = await service.fetchToken()
        expect(token).toBe('jwt')
    })

    it('throws if OIDC config fetch fails', async () => {
        getOIDCConfigSpy.mockRejectedValue(new Error('config fail'))
        await expect(service.fetchToken()).rejects.toThrow('config fail')
    })

    it('throws if token endpoint fetch fails', async () => {
        getOIDCConfigSpy.mockResolvedValue({
            token_endpoint: 'http://idp/token',
        })
        fetchAdminTokenSpy.mockRejectedValue(new Error('token fail'))

        await expect(service.fetchToken()).rejects.toThrow('token fail')
    })

    it('throws if access_token missing', async () => {
        getOIDCConfigSpy.mockResolvedValue({
            token_endpoint: 'http://idp/token',
        })
        fetchAdminTokenSpy.mockResolvedValue({
            ok: true,
            json: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
        } as unknown as Response)

        await expect(service.fetchToken()).rejects.toThrow(
            'No access_token in token endpoint response'
        )
    })
})
