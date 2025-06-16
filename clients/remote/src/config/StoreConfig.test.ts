import { expect, test } from '@jest/globals'
import * as s from './StoreConfig.js'
import * as path from 'path'
import { loadConfig } from 'zod-config'
import { jsonAdapter } from 'zod-config/json-adapter'
import { readFileSync } from 'fs'

test('account config from json file', async () => {
    const __dirname = path.resolve()

    const filePath = path.join(__dirname, '../test/account-config.json')
    const resp = await loadConfig({
        schema: s.accountSchema,
        adapters: jsonAdapter({
            path: filePath,
        }),
    })

    expect(resp.id).toBe('xyz')
    expect(resp.name).toBe('name1')
})

test('network config from json file', async () => {
    const __dirname = path.resolve()

    const filePath = path.join(__dirname, '../test/network-config.json')
    const resp = await loadConfig({
        schema: s.networkConfigSchema,
        adapters: jsonAdapter({
            path: filePath,
        }),
    })
    expect(resp.name).toBe('xyz')
    expect(resp.ledgerApi.baseUrl).toBe('https://test')
    expect(resp.authType.clientId).toBe('wk-service-account')
    expect(resp.authType.scope).toBe('openid')
    // expect(resp.authType.grantType).toBe('password')
})

// test('multiple network config from json file', async () => {
//     const __dirname = path.resolve()

//     const filePath = path.join(__dirname, '../test/multi-network-config.json')

//     const jsonData = JSON.parse(readFileSync(filePath, 'utf-8'))
//     const resp = s.networks.parse(jsonData)

//     resp[0].authType

// })

test('multiple account config from json file', async () => {
    const __dirname = path.resolve()

    const filePath = path.join(__dirname, '../test/multi-account-config.json')

    const jsonData = JSON.parse(readFileSync(filePath, 'utf-8'))
    const resp = s.accounts.parse(jsonData)

    console.log(resp[0])
    expect(resp.length).toBe(2)
    expect(resp[0].id).toBe('xyz')
    expect(resp[0].name).toBe('name1')

    expect(resp[1].id).toBe('abc')
    expect(resp[1].name).toBe('name2')
})
