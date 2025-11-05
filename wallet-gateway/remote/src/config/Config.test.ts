// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from '@jest/globals'
import { ConfigUtils } from './ConfigUtils.js'

test('config from json file', async () => {
    const resp = ConfigUtils.loadConfigFile('../test/config.json')
    expect(resp.store.networks[0].name).toBe('Local (OAuth IDP)')
    expect(resp.store.networks[0].ledgerApi.baseUrl).toBe(
        'http://127.0.0.1:5003'
    )
    expect(resp.store.networks[0].auth.clientId).toBe('operator')
    expect(resp.store.networks[0].auth.scope).toBe(
        'openid daml_ledger_api offline_access'
    )
    expect(resp.store.networks[0].auth.method).toBe('authorization_code')
    expect(resp.store.networks[1].auth.method).toBe('client_credentials')
    if (resp.store.networks[1].auth.method === 'client_credentials') {
        expect(resp.store.networks[1].auth.audience).toBe(
            'https://daml.com/jwt/aud/participant/participant1::1220d44fc1c3ba0b5bdf7b956ee71bc94ebe2d23258dc268fdf0824fbaeff2c61424'
        )
    }
})

/**
 *                 "id": "canton:local-oauth",
                "name": "Local (OAuth IDP)",
                "description": "Mock OAuth IDP",
                "synchronizerId": "wallet::1220e7b23ea52eb5c672fb0b1cdbc916922ffed3dd7676c223a605664315e2d43edd",
                "identityProviderId": "idp-mock-oauth",
                "auth": {
                    "method": "authorization_code",
                    "clientId": "operator",
                    "scope": "operator",
                    "audience": "https://daml.com/jwt/aud/participant/participant1::1220d44fc1c3ba0b5bdf7b956ee71bc94ebe2d23258dc268fdf0824fbaeff2c61424"
                },
                "adminAuth": {
                    "method": "client_credentials",
                    "scope": "daml_ledger_api",
                    "audience": "https://daml.com/jwt/aud/participant/participant1::1220d44fc1c3ba0b5bdf7b956ee71bc94ebe2d23258dc268fdf0824fbaeff2c61424",
                    "clientId": "participant_admin",
                    "clientSecret": "admin-client-secret"
                },
                "ledgerApi": {
                    "baseUrl": "http://127.0.0.1:5003"
                }

 */
