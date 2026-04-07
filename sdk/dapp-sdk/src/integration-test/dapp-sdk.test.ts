// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import { DappSDK } from '../sdk'
import { InjectedAdapter } from '../adapter/injected-adapter'
import { MockProviderAsync } from './mock-provider-async'

describe('dApp SDK integration test', () => {
    it('sets window.canton via injectProvider after DappSDK.connect', async () => {
        expect(window.canton).toBeUndefined()

        const wallet = new MockProviderAsync()
        const adapter = new InjectedAdapter({
            id: 'integration-mock',
            name: 'integration mock wallet',
            description: 'mock description',
            provider: wallet,
        })

        const sdk = new DappSDK({
            walletPicker: async (entries) => {
                const entry = entries.find(
                    (e) => e.providerId === 'browser:integration-mock'
                )
                if (!entry) {
                    throw new Error(
                        `mock adapter missing; entries=${entries.map((e) => e.providerId).join(',')}`
                    )
                }
                return {
                    providerId: entry.providerId,
                    name: entry.name,
                    type: entry.type,
                }
            },
        })

        await sdk.connect({
            defaultAdapters: [],
            additionalAdapters: [adapter],
        })

        expect(window.canton).toBeDefined()
        expect(window.canton).toBe(sdk.getConnectedProvider())
    })
})
