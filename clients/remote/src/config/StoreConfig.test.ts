import { expect, test } from '@jest/globals'
import * as s from './StoreConfig.js'
import { ConfigUtils } from './ConfigUtils.js'

test('account config from json file', async () => {
    const jsonData = ConfigUtils.loadConfigFile('../test/account-config.json')
    const resp = s.accountSchema.parse(jsonData)
    expect(resp.id).toBe('xyz')
    expect(resp.name).toBe('name1')
})

test('network config from json file', async () => {
    const jsonData = ConfigUtils.loadConfigFile('../test/network-config.json')
    const resp = s.networkConfigSchema.parse(jsonData)
    expect(resp.name).toBe('xyz')
    expect(resp.ledgerApi.baseUrl).toBe('https://test')
    expect(resp.auth.clientId).toBe('wk-service-account')
    expect(resp.auth.scope).toBe('openid')
    expect(resp.auth.type).toBe('password')
})

test('multiple network config from json file', async () => {
    const jsonData = ConfigUtils.loadConfigFile(
        '../test/multi-network-config.json'
    )
    const resp = s.networksSchema.parse(jsonData)

    expect(resp[0].auth.type).toBe('password')
    if (resp[0].auth.type === 'password') {
        expect(resp[0].auth.tokenUrl).toBe('tokenUrl')
    }
    expect(resp[1].auth.type).toBe('implicit')
    if (resp[1].auth.type === 'implicit') {
        expect(resp[1].auth.audience).toBe(
            'https://daml.com/jwt/aud/participant/wk-app'
        )
    }
})

test('multiple account config from json file', async () => {
    const jsonData = ConfigUtils.loadConfigFile(
        '../test/multi-account-config.json'
    )
    const resp = s.accounts.parse(jsonData)

    expect(resp.length).toBe(2)
    expect(resp[0].id).toBe('xyz')
    expect(resp[0].name).toBe('name1')

    expect(resp[1].id).toBe('abc')
    expect(resp[1].name).toBe('name2')
})
