// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Async / remote gateway integration (real Chromium, mock HTTP server in Vitest globalSetup).
 *
 * **Layout**
 * - Top-level `describe`: shared hooks (mocks, storage, `window.canton`).
 * - Nested `describe` per `DappSDK` method; `it` blocks per branch / assertion type (return value, events, side effects).
 *
 * **Note:** `DappSDK` has no `onConnected`. Connection completion is reflected by:
 * - `connect()`’s resolved {@link ConnectResult}
 * - `RemoteAdapter` listening to provider `statusChanged` → {@link storage.setKernelSession} (assert via `getKernelSession()`)
 * - {@link DappSDK.onStatusChanged} for *subsequent* `statusChanged` emissions from the provider (subscribe after `connect()`).
 *
 * **Connect-time behaviour elsewhere in the stack (for future cases):**
 * - `connect()` calls `clearAllLocalState()` before picking a wallet (session/discovery cleared, then re-filled for remote).
 * - Remote: `setKernelDiscovery`, `saveRecentGateway`, `DappClient` + `injectProvider` → `window.canton`.
 * - `DiscoveryClient` emits `discovery:connected` internally (not exposed on `DappSDK`).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DappSDK } from '../sdk'
import { RemoteAdapter } from '../adapter/remote-adapter'
import { popup } from '@canton-network/core-wallet-ui-components'
import { installMockRemoteIdpPostMessage } from './remote-test-helpers'
import { MOCK_DAPP_API_PATH } from './mock-remote-gateway/json-rpc-handlers'
import * as storage from '../storage'

const REMOTE_ORIGIN =
    (import.meta as ImportMeta & { env: { VITE_MOCK_REMOTE_URL?: string } }).env
        .VITE_MOCK_REMOTE_URL ?? 'http://127.0.0.1:13030'

const RPC_URL = REMOTE_ORIGIN + MOCK_DAPP_API_PATH
const PROVIDER_ID = 'remote:integration' as const
const RECENT_GATEWAYS_KEY = 'splice_wallet_picker_recent'

function createIntegrationSdk(): { sdk: DappSDK; remote: RemoteAdapter } {
    const remote = new RemoteAdapter({
        name: 'integration remote gateway',
        rpcUrl: RPC_URL,
        providerId: PROVIDER_ID,
    })
    const sdk = new DappSDK({
        walletPicker: async (entries) => {
            const entry = entries.find((e) => e.providerId === PROVIDER_ID)
            if (!entry) {
                throw new Error(
                    `remote adapter missing; got ${entries.map((e) => e.providerId).join(',')}`
                )
            }
            return {
                providerId: entry.providerId,
                name: entry.name,
                type: entry.type,
            }
        },
    })
    return { sdk, remote }
}

describe('dApp SDK - async', () => {
    let restoreFetch: (() => void) | undefined

    beforeEach(() => {
        localStorage.clear()
        delete (window as Window & { canton?: unknown }).canton
        vi.spyOn(popup, 'open').mockImplementation(() => undefined)
        vi.spyOn(popup, 'close').mockImplementation(() => undefined)
        restoreFetch = installMockRemoteIdpPostMessage()
    })

    afterEach(() => {
        restoreFetch?.()
        vi.restoreAllMocks()
    })

    describe('connect', () => {
        it('resolves with ConnectResult indicating an estabilished session', async () => {
            const { sdk, remote } = createIntegrationSdk()

            const result = await sdk.connect({
                defaultAdapters: [remote],
            })

            expect(result.isConnected).toBe(true)
            expect(result.isNetworkConnected).toBe(true)
            expect(result.userUrl).toBeDefined()

            await sdk.disconnect()
        })

        it('injects the connected provider on window.canton', async () => {
            const { sdk, remote } = createIntegrationSdk()
            expect(window.canton).toBeUndefined()

            await sdk.connect({ defaultAdapters: [remote] })

            expect(window.canton).toBeDefined()
            expect(window.canton).toBe(sdk.getConnectedProvider())

            await sdk.disconnect()
        })

        it('persists remote kernel discovery metadata (setKernelDiscovery)', async () => {
            const { sdk, remote } = createIntegrationSdk()

            await sdk.connect({ defaultAdapters: [remote] })

            const discovery = storage.getKernelDiscovery()
            expect(discovery?.walletType).toBe('remote')
            expect(discovery?.url).toBe(remote.rpcUrl)

            await sdk.disconnect()
        })

        it('persists kernel session after connection (provider statusChanged → setKernelSession in RemoteAdapter)', async () => {
            const { sdk, remote } = createIntegrationSdk()

            await sdk.connect({ defaultAdapters: [remote] })

            const session = storage.getKernelSession()
            expect(session?.session?.accessToken).toBe('integration-test-token')
            expect(session?.connection.isConnected).toBe(true)

            await sdk.disconnect()
        })

        it('appends the gateway to the recent wallet picker list', async () => {
            const { sdk, remote } = createIntegrationSdk()

            await sdk.connect({ defaultAdapters: [remote] })

            const raw = localStorage.getItem(RECENT_GATEWAYS_KEY)
            expect(raw).toBeTruthy()
            const recent = JSON.parse(raw!) as {
                name: string
                rpcUrl: string
            }[]
            expect(recent.length).toBeGreaterThan(0)
            expect(recent[0]?.rpcUrl).toBe(RPC_URL)

            await sdk.disconnect()
        })

        it('opens the wallet login URL via popup during the connect flow', async () => {
            const { sdk, remote } = createIntegrationSdk()

            await sdk.connect({ defaultAdapters: [remote] })

            expect(popup.open).toHaveBeenCalled()
            const firstUrl = vi.mocked(popup.open).mock.calls[0]?.[0]
            expect(firstUrl).toContain('/login')

            await sdk.disconnect()
        })
    })
})
