import { expect, jest, test } from '@jest/globals'

import request from 'supertest'
import { user } from './server.js'
import { StoreInternal } from 'core-wallet-store'
import { AuthService } from 'core-wallet-auth'
import { ConfigUtils } from '../config/ConfigUtils.js'
import { Notifier } from '../notification/NotificationService.js'
import { configSchema } from '../config/Config.js'

jest.mock('core-ledger-client')

const authService: AuthService = {
    verifyToken: async () => {
        return new Promise((resolve) =>
            resolve({ userId: 'user123', accessToken: 'token123' })
        )
    },
}

const configPath = process.env.NETWORK_CONFIG_PATH || '../test/config.json'
const configFile = ConfigUtils.loadConfigFile(configPath)
const config = configSchema.parse(configFile)

const store = new StoreInternal(config.store)

const notificationService = {
    getNotifier: jest.fn<() => Notifier>().mockReturnValue({
        on: jest.fn(),
        emit: jest.fn<Notifier['emit']>(),
        removeListener: jest.fn(),
    }),
}

test('call connect rpc', async () => {
    const drivers = {}
    const response = await request(
        user(config.kernel, notificationService, authService, drivers, store)
    )
        .post('/rpc')
        .send({ jsonrpc: '2.0', id: 0, method: 'listNetworks', params: [] })
        .set('Accept', 'application/json')

    expect(response.body).toEqual({
        jsonrpc: '2.0',
        id: 0,
        result: {
            networks: [
                {
                    name: 'Local (password IDP)',
                    chainId: 'canton:local-password',
                    synchronizerId:
                        'wallet::1220e7b23ea52eb5c672fb0b1cdbc916922ffed3dd7676c223a605664315e2d43edd',
                    description: 'Unimplemented Password Auth',
                    ledgerApi: { baseUrl: 'https://test' },
                    auth: {
                        type: 'password',
                        issuer: 'http://127.0.0.1:8889',
                        configUrl:
                            'http://127.0.0.1:8889/.well-known/openid-configuration',
                        tokenUrl: 'tokenUrl',
                        grantType: 'password',
                        scope: 'openid',
                        clientId: 'wk-service-account',
                    },
                },
                {
                    name: 'Local (OAuth IDP)',
                    chainId: 'canton:local-oauth',
                    synchronizerId:
                        'wallet::1220e7b23ea52eb5c672fb0b1cdbc916922ffed3dd7676c223a605664315e2d43edd',
                    description: 'Mock OAuth IDP',
                    ledgerApi: { baseUrl: 'http://127.0.0.1:5003' },
                    auth: {
                        type: 'implicit',
                        issuer: 'http://127.0.0.1:8889',
                        configUrl:
                            'http://127.0.0.1:8889/.well-known/openid-configuration',
                        audience:
                            'https://daml.com/jwt/aud/participant/participant1::1220d44fc1c3ba0b5bdf7b956ee71bc94ebe2d23258dc268fdf0824fbaeff2c61424',
                        scope: 'openid daml_ledger_api offline_access',
                        clientId: 'operator',
                    },
                },
            ],
        },
    })
    expect(response.statusCode).toBe(200)
})
