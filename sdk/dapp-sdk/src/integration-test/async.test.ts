// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type {
    RpcTypes as DappRpcTypes,
    StatusEvent,
    TxChangedEvent,
    Wallet,
} from '@canton-network/core-wallet-dapp-rpc-client'
import type { Provider } from '@canton-network/core-splice-provider'
import { DappSDK } from '../sdk'
import { RemoteAdapter } from '../adapter/remote-adapter'
import { popup } from '@canton-network/core-wallet-ui-components'
import { installMockRemoteIdpPostMessage } from './async-test-helpers'
import {
    connectResultConnected,
    MOCK_DAPP_API_PATH,
    statusConnected,
} from './mock-remote-gateway/json-rpc-handlers'
import * as storage from '../storage'

type ListenerFn = (...args: unknown[]) => void

function listenerCount(
    provider: Provider<DappRpcTypes>,
    event: string
): number {
    return provider.remoteProvider.listeners[event]?.length ?? 0
}

function hasListener(
    provider: Provider<DappRpcTypes>,
    event: string,
    fn: ListenerFn
): boolean {
    const list = provider.remoteProvider.listeners[event]
    return list?.includes(fn) ?? false
}

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
        it('resolves with ConnectResult indicating an established session', async () => {
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

    describe('event subscriptions', () => {
        const sampleWallet: Wallet = {
            primary: true,
            partyId: 'Party::integration',
            status: 'allocated',
            hint: 'h',
            publicKey: 'pk',
            namespace: 'ns',
            networkId: 'network',
            signingProviderId: 'sp',
        }

        const txPending: TxChangedEvent = {
            status: 'pending',
            commandId: 'integration-command-id',
        }

        type EventListenerCase = {
            title: string
            eventKey:
                | 'statusChanged'
                | 'accountsChanged'
                | 'connected'
                | 'txChanged'
            subscribe: (sdk: DappSDK, h: ListenerFn) => Promise<void>
            unsubscribe: (sdk: DappSDK, h: ListenerFn) => Promise<void>
            buildEmitArg: () => unknown
        }

        const eventListenerCases: readonly EventListenerCase[] = [
            {
                title: 'onStatusChanged / removeOnStatusChanged',
                eventKey: 'statusChanged',
                subscribe: (sdk, h) =>
                    sdk.onStatusChanged(h as (e: StatusEvent) => void),
                unsubscribe: (sdk, h) =>
                    sdk.removeOnStatusChanged(h as (e: StatusEvent) => void),
                buildEmitArg: () => statusConnected('http://127.0.0.1:13030'),
            },
            {
                title: 'onAccountsChanged / removeOnAccountsChanged',
                eventKey: 'accountsChanged',
                subscribe: (sdk, h) =>
                    sdk.onAccountsChanged(h as (batch: Wallet[]) => void),
                unsubscribe: (sdk, h) =>
                    sdk.removeOnAccountsChanged(h as (batch: Wallet[]) => void),
                buildEmitArg: () => [sampleWallet],
            },
            {
                title: 'onConnected / removeOnConnected',
                eventKey: 'connected',
                subscribe: (sdk, h) =>
                    sdk.onConnected(h as (e: StatusEvent) => void),
                unsubscribe: (sdk, h) =>
                    sdk.removeOnConnected(h as (e: StatusEvent) => void),
                buildEmitArg: () =>
                    connectResultConnected('http://127.0.0.1:13030'),
            },
            {
                title: 'onTxChanged / removeOnTxChanged',
                eventKey: 'txChanged',
                subscribe: (sdk, h) =>
                    sdk.onTxChanged(h as (e: TxChangedEvent) => void),
                unsubscribe: (sdk, h) =>
                    sdk.removeOnTxChanged(h as (e: TxChangedEvent) => void),
                buildEmitArg: () => txPending,
            },
        ]

        it.each(eventListenerCases)(
            '$title: delegates to provider.on($eventKey, listener) and records the handler',
            async ({ eventKey, subscribe }) => {
                const { sdk, remote } = createIntegrationSdk()
                await sdk.connect({ defaultAdapters: [remote] })
                const provider = sdk.getConnectedProvider()!
                const onSpy = vi.spyOn(provider, 'on')

                const handler = vi.fn()
                await subscribe(sdk, handler)

                expect(onSpy).toHaveBeenCalledWith(eventKey, handler)
                expect(hasListener(provider, eventKey, handler)).toBe(true)
                expect(listenerCount(provider, eventKey)).toBeGreaterThan(0)

                await sdk.disconnect()
            }
        )

        it.each(eventListenerCases)(
            '$title: runs the callback when the event is emitted on the provider',
            async ({ eventKey, subscribe, buildEmitArg }) => {
                const { sdk, remote } = createIntegrationSdk()
                await sdk.connect({ defaultAdapters: [remote] })
                const provider = sdk.getConnectedProvider()!

                const received: unknown[] = []
                const handler = (arg: unknown) => received.push(arg)
                await subscribe(sdk, handler as ListenerFn)

                const payload = buildEmitArg()
                provider.emit(eventKey, payload)

                expect(received).toHaveLength(1)
                expect(received[0]).toEqual(payload)

                await sdk.disconnect()
            }
        )

        it.each(eventListenerCases)(
            '$title: unsubscribe drops the listener so emit does not invoke it',
            async ({ eventKey, subscribe, unsubscribe, buildEmitArg }) => {
                const { sdk, remote } = createIntegrationSdk()
                await sdk.connect({ defaultAdapters: [remote] })
                const provider = sdk.getConnectedProvider()!
                const removeSpy = vi.spyOn(provider, 'removeListener')

                const handler = vi.fn()
                await subscribe(sdk, handler)
                await unsubscribe(sdk, handler)

                expect(removeSpy).toHaveBeenCalledWith(eventKey, handler)
                expect(hasListener(provider, eventKey, handler)).toBe(false)

                provider.emit(eventKey, buildEmitArg())
                expect(handler).not.toHaveBeenCalled()

                await sdk.disconnect()
            }
        )
    })
})
