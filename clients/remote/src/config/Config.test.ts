// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
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
            'https://daml.com/jwt/aud/participant/participant1::1220d44fc1c3ba0b5bdf7b956ee71bc94ebe2d23258dc268fdf0824fbaeff2c61424'
        )
    }
})
