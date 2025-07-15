import { expect, jest, test } from '@jest/globals'

import request from 'supertest'
import { user } from './server.js'
import { StoreInternal } from 'core-wallet-store'
import { AuthService } from 'core-wallet-auth'
import { ConfigUtils } from '../config/ConfigUtils.js'
import { LedgerClient } from 'core-ledger-client'
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
const ledgerClient = new LedgerClient('http://localhost:5003', async () => {
    return ''
})

const notificationService = {
    getNotifier: jest.fn<() => Notifier>().mockReturnValue({
        on: jest.fn(),
        emit: jest.fn<Notifier['emit']>(),
        removeListener: jest.fn(),
    }),
}

test('call connect rpc', async () => {
    const response = await request(
        user(
            config.kernel,
            ledgerClient,
            notificationService,
            authService,
            store
        )
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
                        'wallet::1220aa7665e1190b584acc00a808f6a11a0a96aebf171f6f9a78d343b34461752ea2::34-0',
                    description: 'Unimplemented Password Auth',
                    ledgerApi: { baseUrl: 'https://test' },
                    auth: {
                        type: 'password',
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
                        'wallet::1220aa7665e1190b584acc00a808f6a11a0a96aebf171f6f9a78d343b34461752ea2::34-0',
                    description: 'Mock OAuth IDP',
                    ledgerApi: { baseUrl: 'https://test' },
                    auth: {
                        type: 'implicit',
                        domain: 'http://127.0.0.1:8889',
                        audience:
                            'https://daml.com/jwt/aud/participant/wallet-kernel',
                        scope: 'openid daml_ledger_api offline_access',
                        clientId: 'Cg9zZXJ2aWNlLmFjY291bnQSBWxvY2Fs',
                    },
                },
            ],
        },
    })
    expect(response.statusCode).toBe(200)
})
