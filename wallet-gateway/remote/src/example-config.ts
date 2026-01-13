// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Config } from './config/Config.js'

export default {
    kernel: {
        id: 'remote-da',
        clientType: 'remote',
    },
    server: {
        port: 3030,
        dappPath: '/api/v0/dapp',
        userPath: '/api/v0/user',
        allowedOrigins: '*',
        requestSizeLimit: '5mb',
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
                    audience: '<REPLACE_PARTICIPANT_AUDIENCE>',
                    scope: 'openid daml_ledger_api offline_access',
                    clientId: '<REPLACE_CLIENT_ID>',
                    clientSecret: 'unsafe',
                },
                adminAuth: {
                    method: 'self_signed',
                    issuer: 'self-signed',
                    scope: 'daml_ledger_api',
                    audience: '<REPLACE_PARTICIPANT_AUDIENCE>',
                    clientId: '<REPLACE_ADMIN_CLIENT_ID>',
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
                    clientId: '<REPLACE_USER_CLIENT_ID>',
                    scope: 'openid daml_ledger_api offline_access',
                    audience: '<REPLACE_PARTICIPANT_AUDIENCE>',
                },
                adminAuth: {
                    method: 'client_credentials',
                    scope: 'daml_ledger_api',
                    audience: '<REPLACE_PARTICIPANT_AUDIENCE>',
                    clientId: '<REPLACE_ADMIN_CLIENT_ID>',
                    clientSecret: '<REPLACE_ADMIN_CLIENT_SECRET>',
                },
                ledgerApi: {
                    baseUrl: 'http://127.0.0.1:2975',
                },
            },
        ],
    },
} satisfies Config
