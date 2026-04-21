// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WalletEvent } from '@canton-network/core-types'
import { DappSDK } from '../sdk'
import * as storage from '../storage'
import {
    MOCK_EXTENSION_PROVIDER_ID,
    startMockExtension,
} from './mock-extension/mock-extension'

function createSyncSdk(): DappSDK {
    return new DappSDK({
        walletPicker: async (entries) => {
            const entry = entries.find(
                (e) => e.providerId === MOCK_EXTENSION_PROVIDER_ID
            )
            if (!entry) {
                throw new Error(
                    `extension adapter missing; got ${entries
                        .map((e) => e.providerId)
                        .join(',')}`
                )
            }
            return {
                providerId: entry.providerId,
                name: entry.name,
                type: entry.type,
            }
        },
    })
}

describe('dApp SDK - sync', () => {
    let stopMockExtension: (() => void) | undefined

    beforeEach(() => {
        localStorage.clear()
        delete (window as Window & { canton?: unknown }).canton
        stopMockExtension = startMockExtension()
    })

    afterEach(() => {
        stopMockExtension?.()
        vi.restoreAllMocks()
    })

    describe('connect', () => {
        it('auto registers the extension via CANTON_ANNOUNCE_PROVIDER_EVENT and resolves with ConnectResult', async () => {
            const sdk = createSyncSdk()

            const result = await sdk.connect()

            expect(result.isConnected).toBe(true)
            expect(result.isNetworkConnected).toBe(true)

            await sdk.disconnect()
        })

        it('injects the connected provider on window.canton', async () => {
            const sdk = createSyncSdk()
            expect(window.canton).toBeUndefined()

            await sdk.connect()

            expect(window.canton).toBeDefined()
            expect(window.canton).toBe(sdk.getConnectedProvider())

            await sdk.disconnect()
        })

        it('persists discovery metadata', async () => {
            const sdk = createSyncSdk()

            await sdk.connect()

            const discovery = storage.getKernelDiscovery()
            expect(discovery?.walletType).toBe('extension')
            expect(discovery?.providerId).toBe(MOCK_EXTENSION_PROVIDER_ID)

            await sdk.disconnect()
        })

        it('communicates request over postMessage', async () => {
            const sdk = createSyncSdk()

            const seen: string[] = []
            const listener = (event: MessageEvent): void => {
                const data = event.data as {
                    type?: string
                    request?: { method?: string }
                }
                if (data?.type === WalletEvent.SPLICE_WALLET_REQUEST) {
                    const method = data.request?.method
                    if (method) seen.push(method)
                }
            }
            window.addEventListener('message', listener)

            try {
                await sdk.connect()
            } finally {
                window.removeEventListener('message', listener)
            }

            expect(seen).toEqual(expect.arrayContaining(['connect']))

            await sdk.disconnect()
        })
    })
})
