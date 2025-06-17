import { expect, test } from '@jest/globals'
import * as s from './StoreConfig.js'
import * as path from 'path'
import { readFileSync } from 'fs'

test('account config from json file', async () => {
    const __dirname = path.resolve()

    const filePath = path.join(__dirname, '../test/account-config.json')

    const jsonData = JSON.parse(readFileSync(filePath, 'utf-8'))
    const resp = s.accountSchema.parse(jsonData)
    expect(resp.id).toBe('xyz')
    expect(resp.name).toBe('name1')
})

test('network config from json file', async () => {
    const __dirname = path.resolve()

    const filePath = path.join(__dirname, '../test/network-config.json')

    const jsonData = JSON.parse(readFileSync(filePath, 'utf-8'))
    const resp = s.networkConfigSchema.parse(jsonData)
    expect(resp.name).toBe('xyz')
    expect(resp.ledgerApi.baseUrl).toBe('https://test')
    expect(resp.authType.clientId).toBe('wk-service-account')
    expect(resp.authType.scope).toBe('openid')
    expect(resp.authType.type).toBe('password')
})

test('multiple network config from json file', async () => {
    const __dirname = path.resolve()

    const filePath = path.join(__dirname, '../test/multi-network-config.json')

    const jsonData = JSON.parse(readFileSync(filePath, 'utf-8'))
    const resp = s.networks.parse(jsonData)

    expect(resp[0].authType.type).toBe('password')
    if (resp[0].authType.type === 'password') {
        expect(resp[0].authType.tokenUrl).toBe('tokenUrl')
    }
    expect(resp[1].authType.type).toBe('implicit')
    if (resp[1].authType.type === 'implicit') {
        expect(resp[1].authType.audience).toBe(
            'https://daml.com/jwt/aud/participant/wk-app'
        )
    }
})

test('multiple account config from json file', async () => {
    const __dirname = path.resolve()

    const filePath = path.join(__dirname, '../test/multi-account-config.json')

    const jsonData = JSON.parse(readFileSync(filePath, 'utf-8'))
    const resp = s.accounts.parse(jsonData)

    expect(resp.length).toBe(2)
    expect(resp[0].id).toBe('xyz')
    expect(resp[0].name).toBe('name1')

    expect(resp[1].id).toBe('abc')
    expect(resp[1].name).toBe('name2')
})
