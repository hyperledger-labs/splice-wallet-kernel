import { expect, test } from '@jest/globals'
import * as s from './Config.js'
import { ConfigUtils } from './ConfigUtils.js'

test('config from json file', async () => {
    const jsonData = ConfigUtils.loadConfigFile('../test/config.json')
    const resp = s.configSchema.parse(jsonData)
    expect(resp.store.networks[0].name).toBe('Local (password IDP)')
    expect(resp.store.networks[0].ledgerApi.baseUrl).toBe('https://test')
    expect(resp.store.networks[0].auth.clientId).toBe('wk-service-account')
    expect(resp.store.networks[0].auth.scope).toBe('openid')
    expect(resp.store.networks[0].auth.type).toBe('password')
    if (resp.store.networks[0].auth.type === 'password') {
        expect(resp.store.networks[0].auth.tokenUrl).toBe('tokenUrl')
    }
    expect(resp.store.networks[1].auth.type).toBe('implicit')
    if (resp.store.networks[1].auth.type === 'implicit') {
        expect(resp.store.networks[1].auth.audience).toBe(
            'https://daml.com/jwt/aud/participant/participant1::12204896f5edaba049a658f4d09f12d7c7f762a3fecfae6bdd4f96c7b704f90c2b42'
        )
    }
})
