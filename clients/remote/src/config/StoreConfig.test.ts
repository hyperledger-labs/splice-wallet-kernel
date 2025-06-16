import { expect, test } from '@jest/globals'
import * as s from './StoreConfig.js'
import * as path from 'path'
import { loadConfig } from 'zod-config'
import { jsonAdapter } from 'zod-config/json-adapter'

test('account config from json file', async () => {
    const __dirname = path.resolve()

    const filePath = path.join(__dirname, '../test/accountconfig.json')
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

    const filePath = path.join(__dirname, '../test/networkconfig.json')
    const resp = await loadConfig({
        schema: s.networkConfigSchema,
        adapters: jsonAdapter({
            path: filePath,
        }),
    })

    console.log(resp)
    expect(resp.name).toBe('xyz')
    expect(resp.ledgerApi.baseUrl).toBe('https://test')
    expect(resp.authType.clientId).toBe('wk-service-account')
    expect(resp.authType.scope).toBe('openid')
    expect(resp.authType.grantType).toBe('password')
})

// test('multiple network config from json file', async () => {
//     const __dirname = path.resolve()

//     const filePath = path.join(__dirname, '../test/multi-network-config.json')
//     const resp = await loadConfig({
//         schema: s.networkConfigSchema,
//         adapters: jsonAdapter({
//             path: filePath,
//         }),
//     })

//     console.log(resp)
// })
