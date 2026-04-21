// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type {
    RpcTypes as DappRpcTypes,
    LedgerApiParams,
    SignMessageParams,
    StatusEvent,
    TxChangedEvent,
    Wallet,
} from '@canton-network/core-wallet-dapp-rpc-client'
import type { Provider } from '@canton-network/core-splice-provider'
import { WalletEvent } from '@canton-network/core-types'
import { DappSDK } from '../sdk'
import * as storage from '../storage'
import {
    extensionConnectResult,
    extensionStatusEvent,
    MOCK_EXTENSION_NETWORK_ID,
    MOCK_EXTENSION_PROVIDER_ID,
    startMockExtension,
} from './mock-extension/mock-extension'

// TODO maybe I should share common utils with async api tests?
type ListenerFn = (...args: unknown[]) => void

function listenerCount(
    provider: Provider<DappRpcTypes>,
    event: string
): number {
    return provider.listeners[event]?.length ?? 0
}

function hasListener(
    provider: Provider<DappRpcTypes>,
    event: string,
    fn: ListenerFn
): boolean {
    return provider.listeners[event]?.includes(fn) ?? false
}

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

    describe('disconnect', () => {
        it('delegates to provider.request', async () => {
            const sdk = createSyncSdk()
            await sdk.connect()
            const provider = sdk.getConnectedProvider()!
            const requestSpy = vi.spyOn(provider, 'request')

            await sdk.disconnect()

            expect(requestSpy).toHaveBeenCalledWith({ method: 'disconnect' })
        })

        it('sends a disconnect RPC over postMessage to the extension', async () => {
            const sdk = createSyncSdk()
            await sdk.connect()

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
                await sdk.disconnect()
            } finally {
                window.removeEventListener('message', listener)
            }

            expect(seen).toEqual(expect.arrayContaining(['disconnect']))
        })

        it('clears persisted kernel discovery from localStorage', async () => {
            const sdk = createSyncSdk()
            await sdk.connect()
            expect(storage.getKernelDiscovery()).toBeDefined()

            await sdk.disconnect()

            expect(storage.getKernelDiscovery()).toBeUndefined()
        })

        it('drops the active session so subsequent sdk calls throw', async () => {
            const sdk = createSyncSdk()
            await sdk.connect()

            await sdk.disconnect()

            await expect(sdk.listAccounts()).rejects.toThrow(/Not connected/)
        })
    })

    describe('event subscriptions', () => {
        const sampleWallet: Wallet = {
            primary: true,
            partyId: 'Party::sync-integration',
            status: 'allocated',
            hint: 'h',
            publicKey: 'pk',
            namespace: 'ns',
            networkId: MOCK_EXTENSION_NETWORK_ID,
            signingProviderId: 'sp',
        }

        const txPending: TxChangedEvent = {
            status: 'pending',
            commandId: 'sync-integration-command-id',
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
                buildEmitArg: () => extensionStatusEvent(),
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
                buildEmitArg: () => extensionConnectResult(),
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
                const sdk = createSyncSdk()
                await sdk.connect()
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
                const sdk = createSyncSdk()
                await sdk.connect()
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
                const sdk = createSyncSdk()
                await sdk.connect()
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

    it('sdk.status delegates to provider.request', async () => {
        const sdk = createSyncSdk()
        await sdk.connect()
        const provider = sdk.getConnectedProvider()!
        const requestSpy = vi.spyOn(provider, 'request')

        await sdk.status()

        expect(requestSpy).toHaveBeenCalledWith({ method: 'status' })

        await sdk.disconnect()
    })

    it('sdk.listAccounts delegates to provider.request', async () => {
        const sdk = createSyncSdk()
        await sdk.connect()
        const provider = sdk.getConnectedProvider()!
        const requestSpy = vi.spyOn(provider, 'request')

        await sdk.listAccounts()

        expect(requestSpy).toHaveBeenCalledWith({ method: 'listAccounts' })

        await sdk.disconnect()
    })

    it('sdk.ledgerApi delegates to provider.request', async () => {
        const sdk = createSyncSdk()
        await sdk.connect()
        const provider = sdk.getConnectedProvider()!
        const requestSpy = vi.spyOn(provider, 'request')
        const params: LedgerApiParams = {
            requestMethod: 'get',
            resource: '/parties',
        }

        await sdk.ledgerApi(params)

        expect(requestSpy).toHaveBeenCalledWith({
            method: 'ledgerApi',
            params,
        })

        await sdk.disconnect()
    })

    // TODO make it sdk.getActiveNetwork() once it's added to SDK
    it.skip('sdk.getActiveNetwork delegates to provider.request', async () => {
        const sdk = createSyncSdk()
        await sdk.connect()
        const provider = sdk.getConnectedProvider()!
        const requestSpy = vi.spyOn(provider, 'request')

        await provider.request({ method: 'getActiveNetwork' })

        expect(requestSpy).toHaveBeenCalledWith({
            method: 'getActiveNetwork',
        })

        await sdk.disconnect()
    })

    // TODO make it sdk.getPrimaryAccount() once it's added to SDK
    it('sdk.getPrimaryAccount delegates to provider.request', async () => {
        const sdk = createSyncSdk()
        await sdk.connect()
        const provider = sdk.getConnectedProvider()!
        const requestSpy = vi.spyOn(provider, 'request')

        await provider.request({ method: 'getPrimaryAccount' })

        expect(requestSpy).toHaveBeenCalledWith({
            method: 'getPrimaryAccount',
        })

        await sdk.disconnect()
    })

    // TODO make it sdk.signMessage(params) once it's added to SDK
    it('sdk.signMessage delegates to provider.request', async () => {
        const sdk = createSyncSdk()
        await sdk.connect()
        const provider = sdk.getConnectedProvider()!
        const requestSpy = vi.spyOn(provider, 'request')
        const params: SignMessageParams = {
            message: 'sync-sign-payload',
        }

        await provider.request({ method: 'signMessage', params })

        expect(requestSpy).toHaveBeenCalledWith({
            method: 'signMessage',
            params,
        })

        await sdk.disconnect()
    })
})
