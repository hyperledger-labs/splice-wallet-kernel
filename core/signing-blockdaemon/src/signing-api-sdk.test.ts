// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, describe, test, beforeEach } from 'vitest'
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

describe('SigningAPIClient.setConfiguration CAIP2', () => {
    let client: SigningAPIClient

    beforeEach(() => {
        client = new SigningAPIClient('http://localhost:9999')
    })

    test('defaults to canton:devnet', () => {
        expect(client.getConfiguration().CAIP2).toBe('canton:devnet')
    })

    test('sets Caip2 directly', () => {
        client.setConfiguration({ Caip2: 'canton:testnet' })
        expect(client.getConfiguration().CAIP2).toBe('canton:testnet')
    })

    test('maps deprecated TestNetwork to CAIP2', () => {
        client.setConfiguration({ TestNetwork: false })
        expect(client.getConfiguration().CAIP2).toBe('canton:mainnet')

        client.setConfiguration({ TestNetwork: true })
        expect(client.getConfiguration().CAIP2).toBe('canton:devnet')
    })

    test('accepts consistent Caip2 + TestNetwork', () => {
        client.setConfiguration({ Caip2: 'canton:testnet', TestNetwork: true })
        expect(client.getConfiguration().CAIP2).toBe('canton:testnet')
    })

    test('throws on inconsistent Caip2 + TestNetwork', () => {
        expect(() =>
            client.setConfiguration({
                Caip2: 'canton:mainnet',
                TestNetwork: true,
            })
        ).toThrow('inconsistent')
    })
})
