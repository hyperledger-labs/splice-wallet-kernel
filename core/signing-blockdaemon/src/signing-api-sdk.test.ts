// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, describe, test } from 'vitest'
import BlockdaemonSigningDriver from './index.js'
import { SigningAPIClient } from './signing-api-sdk.js'

describe('BlockdaemonSigningDriver constructor', () => {
    test('passes caip2 from config to the client', () => {
        const driver = new BlockdaemonSigningDriver({
            baseUrl: 'http://localhost:9999',
            apiKey: 'key',
            caip2: 'canton:testnet',
        })
        const client = (driver as unknown as { client: SigningAPIClient })
            .client
        expect(client.getConfiguration().CAIP2).toBe('canton:testnet')
    })

    test('defaults to canton:devnet when caip2 not provided', () => {
        const driver = new BlockdaemonSigningDriver({
            baseUrl: 'http://localhost:9999',
            apiKey: 'key',
        })
        const client = (driver as unknown as { client: SigningAPIClient })
            .client
        expect(client.getConfiguration().CAIP2).toBe('canton:devnet')
    })
})
