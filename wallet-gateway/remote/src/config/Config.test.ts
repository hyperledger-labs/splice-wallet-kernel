// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'
import { ConfigUtils } from './ConfigUtils.js'
import {
    configSchema,
    rawConfigSchema,
    signingProvidersConfigSchema,
} from './Config.js'

test('config from json file', async () => {
    const resp = ConfigUtils.loadConfigFile('../test/config.json')
    expect(resp.bootstrap.networks[0].name).toBe('Local (OAuth IDP)')
    expect(resp.bootstrap.networks[0].ledgerApi.baseUrl).toBe(
        'http://127.0.0.1:5003'
    )
    expect(resp.bootstrap.networks[0].auth.method).toBe('authorization_code')
    if (resp.bootstrap.networks[0].auth.method === 'authorization_code') {
        expect(resp.bootstrap.networks[0].auth.clientId).toBe('operator')
    }
    expect(resp.bootstrap.networks[0].auth.scope).toBe(
        'openid email daml_ledger_api offline_access'
    )
    expect(resp.bootstrap.networks[2].auth.method).toBe('client_credentials')
    if (resp.bootstrap.networks[2].auth.method === 'client_credentials') {
        expect(resp.bootstrap.networks[2].auth.audience).toBe(
            'https://daml.com/jwt/aud/participant/participant1::1220d44fc1c3ba0b5bdf7b956ee71bc94ebe2d23258dc268fdf0824fbaeff2c61424'
        )
    }

    if (resp.bootstrap.networks[4].adminAuth?.method === 'client_credentials') {
        expect(resp.bootstrap.networks[4].adminAuth.clientSecret).toBe(
            'devnet_secret_testval'
        )
    }

    const selfIssuedNetwork = resp.bootstrap.networks.find(
        (network) => network.id === 'canton:local-self-issued'
    )
    expect(selfIssuedNetwork?.adminAuth).toMatchObject({
        method: 'client_credentials',
        identityProviderId: 'idp-mock-oauth',
    })
})

test('signingStore is optional', () => {
    const config = { ...ConfigUtils.loadConfigFile('../test/config.json') }
    delete config.signingStore

    expect(configSchema.parse(config).signingStore).toBeUndefined()
    expect(rawConfigSchema.parse(config).signingStore).toBeUndefined()
})

test('signingProviders is optional and opt-in by presence', () => {
    const config = ConfigUtils.loadConfigFile('../test/config.json')

    expect(configSchema.parse(config).signingProviders).toBeUndefined()
    expect(rawConfigSchema.parse(config).signingProviders).toBeUndefined()
    expect(
        configSchema.parse({ ...config, signingProviders: {} }).signingProviders
    ).toEqual({})
    expect(
        configSchema.parse({
            ...config,
            signingProviders: { fireblocks: { apiPath: 'https://example' } },
        }).signingProviders
    ).toEqual({
        fireblocks: {
            apiPath: 'https://example',
            apiKeyEnv: 'FIREBLOCKS_API_KEY',
            secretEnv: 'FIREBLOCKS_SECRET',
        },
    })
    expect(
        configSchema.parse({
            ...config,
            signingProviders: {
                fireblocks: {
                    apiKeyEnv: 'MY_FIREBLOCKS_API_KEY',
                    secretEnv: 'MY_FIREBLOCKS_SECRET',
                },
            },
        }).signingProviders
    ).toEqual({
        fireblocks: {
            apiPath: 'https://api.fireblocks.io/v1',
            apiKeyEnv: 'MY_FIREBLOCKS_API_KEY',
            secretEnv: 'MY_FIREBLOCKS_SECRET',
        },
    })
})

test('blockdaemon caip2 accepts only supported networks', () => {
    expect(() =>
        signingProvidersConfigSchema.parse({
            blockdaemon: { caip2: 'canton:unknown' },
        })
    ).toThrow()
    expect(
        signingProvidersConfigSchema.parse({
            blockdaemon: { caip2: 'canton:mainnet' },
        }).blockdaemon?.caip2
    ).toBe('canton:mainnet')
    expect(
        signingProvidersConfigSchema.parse({ blockdaemon: {} }).blockdaemon
            ?.caip2
    ).toBe('canton:testnet')
})

test('dfns and securosys in config require non-secret settings', () => {
    expect(() => signingProvidersConfigSchema.parse({ dfns: {} })).toThrow()
    expect(() =>
        signingProvidersConfigSchema.parse({ securosys: {} })
    ).toThrow()
    expect(
        signingProvidersConfigSchema.parse({
            dfns: { orgId: 'org-id', credId: 'credential-id' },
            securosys: { baseUrl: 'https://securosys.example' },
        })
    ).toEqual({
        dfns: {
            orgId: 'org-id',
            baseUrl: 'https://api.dfns.io',
            credId: 'credential-id',
            privateKeyEnv: 'DFNS_PRIVATE_KEY',
            authTokenEnv: 'DFNS_AUTH_TOKEN',
        },
        securosys: {
            baseUrl: 'https://securosys.example',
            signatureAlgorithm: 'EDDSA',
            keyManagementApiKeyEnv: 'SECUROSYS_TSB_KEY_MANAGEMENT_API_KEY',
            keyOperationApiKeyEnv: 'SECUROSYS_TSB_KEY_OPERATION_API_KEY',
            bearerTokenEnv: 'SECUROSYS_TSB_BEARER_TOKEN',
            mtlsP12PasswordEnv: 'SECUROSYS_TSB_MTLS_P12_PASSWORD',
            keyPasswordEnv: 'SECUROSYS_TSB_KEY_PASSWORD',
        },
    })
})
