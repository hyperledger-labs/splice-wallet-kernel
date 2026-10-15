// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { RawConfig } from './config/Config.js'

export default {
    kernel: {
        id: 'remote-da',
        clientType: 'remote',
    },
    logging: {
        level: 'info',
        format: 'pretty',
    },
    server: {
        port: 3030,
        dappPath: '/api/v0/dapp',
        userPath: '/api/v0/user',
        allowedOrigins: '*',
        requestSizeLimit: '5mb',
        requestRateLimit: 10000,
        trustProxy: false,
        admin: 'sub',
        signingWorker: {
            pollInterval: 5000,
        },
    },
    signingProviders: {
        walletKernel: {},
        participant: {},
        fireblocks: {
            apiPath: 'https://api.fireblocks.example',
            apiKeyEnv: 'FIREBLOCKS_API_KEY',
            secretEnv: 'FIREBLOCKS_SECRET',
        },
        blockdaemon: {
            baseUrl: 'https://api.blockdaemon.example',
            caip2: 'canton:testnet',
            apiKeyEnv: 'BLOCKDAEMON_API_KEY',
        },
        dfns: {
            orgId: '1234',
            credId: '1234',
            baseUrl: 'https://api.dfns.example',
            privateKeyEnv: 'DFNS_PRIVATE_KEY',
            authTokenEnv: 'DFNS_AUTH_TOKEN',
        },
        securosys: {
            baseUrl: 'https://api.securosys.example',
            signatureAlgorithm: 'EDDSA',
            keyManagementApiKeyEnv: 'SECUROSYS_TSB_KEY_MANAGEMENT_API_KEY',
            keyOperationApiKeyEnv: 'SECUROSYS_TSB_KEY_OPERATION_API_KEY',
            bearerTokenEnv: 'SECUROSYS_TSB_BEARER_TOKEN',
            mtlsP12PasswordEnv: 'SECUROSYS_TSB_MTLS_P12_PASSWORD',
            keyPasswordEnv: 'SECUROSYS_TSB_KEY_PASSWORD',
        },
        bitgo: {
            baseUrl: 'https://api.bitgo.example',
            enterpriseId: '1234',
            coin: 'canton',
            accessTokenEnv: 'BITGO_ACCESS_TOKEN',
        },
    },
    signingStore: {
        connection: {
            type: 'sqlite',
            database: 'signing_store.sqlite',
        },
    },
    store: {
        connection: {
            type: 'sqlite',
            database: 'store.sqlite',
        },
    },
    bootstrap: {
        idps: [
            {
                id: 'idp-example-self-signed',
                type: 'self_signed',
                issuer: 'unsafe-auth',
            },
            {
                id: 'idp-example-oauth',
                type: 'oauth',
                issuer: 'https://oauth.example.com/',
                configUrl:
                    'https://oauth.example.com/.well-known/openid-configuration',
            },
        ],
        networks: [
            {
                id: 'canton:example-self-signed',
                name: 'Canton Local (Self Signed)',
                description:
                    'A network that connects to a Canton participant using self-signed tokens',
                identityProviderId: 'idp-example-self-signed',
                auth: {
                    method: 'self_signed',
                    issuer: 'self-signed',
                    audience:
                        'https://daml.com/jwt/aud/participant/participant1::1220d44fc1c3ba0b5bdf7b956ee71bc94ebe2d23258dc268fdf0824fbaeff2c61424',
                    scope: 'openid email daml_ledger_api offline_access',
                    clientId: 'example_client_id',
                    clientSecret: 'unsafe',
                },
                adminAuth: {
                    method: 'self_signed',
                    issuer: 'self-signed',
                    scope: 'daml_ledger_api',
                    audience:
                        'https://daml.com/jwt/aud/participant/participant1::1220d44fc1c3ba0b5bdf7b956ee71bc94ebe2d23258dc268fdf0824fbaeff2c61424',
                    clientId: 'example_admin_client_id',
                    clientSecret: 'unsafe',
                },
                ledgerApi: {
                    baseUrl: 'http://127.0.0.1:2975',
                },
            },
            {
                id: 'canton:example-oauth',
                name: 'Canton Local (OAuth IDP)',
                description:
                    'A network that connects to a Canton participant using an OAuth IDP',
                identityProviderId: 'idp-example-oauth',
                auth: {
                    method: 'authorization_code',
                    clientId: 'example_client_id',
                    scope: 'openid email daml_ledger_api offline_access',
                    audience:
                        'https://daml.com/jwt/aud/participant/participant1::1220d44fc1c3ba0b5bdf7b956ee71bc94ebe2d23258dc268fdf0824fbaeff2c61424',
                },
                adminAuth: {
                    method: 'client_credentials',
                    scope: 'daml_ledger_api',
                    audience:
                        'https://daml.com/jwt/aud/participant/participant1::1220d44fc1c3ba0b5bdf7b956ee71bc94ebe2d23258dc268fdf0824fbaeff2c61424',
                    clientId: 'example_admin_client_id',
                    clientSecretEnv: 'MY_CLIENT_SECRET_ENV_VAR',
                },
                ledgerApi: {
                    baseUrl: 'http://127.0.0.1:2975',
                },
            },
        ],
    },
    hashingScheme: {
        version: 'HASHING_SCHEME_VERSION_V3',
    },
} satisfies RawConfig
