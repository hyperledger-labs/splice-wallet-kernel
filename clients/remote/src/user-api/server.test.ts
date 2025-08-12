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


    const json = await response.body.result

    expect(response.statusCode).toBe(200)
    expect(json.networks.length).toBe(3)
    expect(json.networks[0].name).toBe('Local (password IDP)')
    expect(json.networks[1].name).toBe('Local (OAuth IDP)')
    expect(json.networks[2].name).toBe('Local (OAuth IDP - Client Credentials)')
})
