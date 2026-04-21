// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type {
    RpcTypes as DappRpcTypes,
    SignMessageParams,
    StatusEvent,
    TxChangedEvent,
    TxChangedExecutedEvent,
    Wallet,
} from '@canton-network/core-wallet-dapp-rpc-client'
import type { Provider } from '@canton-network/core-splice-provider'
import { WalletEvent } from '@canton-network/core-types'
import type { PrepareExecuteParams } from '../index'
import { DappSDK } from '../sdk'
import { RemoteAdapter } from '../adapter'
import { popup } from '@canton-network/core-wallet-ui-components'
import {
    APPROVE_URL,
    connectResultConnected,
    MOCK_DAPP_API_PATH,
    MOCK_SSE_PUSH_PATH,
    statusConnected,
    USER_URL,
} from './mock-remote-gateway/json-rpc-handlers'
import * as storage from '../storage'
import { ErrorCode } from '../error'

// This test file doesn't validate browser extension wallets, so skip the
// wait for CANTON_ANNOUNCE_PROVIDER_EVENT discovery step to save 600ms per test
vi.mock('../announce-discovery', () => ({
    requestAnnouncedProviders: async () => [],
}))

const MOCK_AUTH_TOKEN = 'integration-test-token'
const MOCK_SESSION_ID = 'integration-test-session'

// Simulate postMessage that popup emits after login
function mockPopupOpen(): void {
    vi.spyOn(popup, 'open').mockImplementation((...args: unknown[]) => {
        const url = args[0] as string
        if (url.includes(USER_URL)) {
            queueMicrotask(() => {
                window.dispatchEvent(
                    new MessageEvent('message', {
                        origin: window.location.origin,
                        data: {
                            type: WalletEvent.SPLICE_WALLET_IDP_AUTH_SUCCESS,
                            token: MOCK_AUTH_TOKEN,
                            sessionId: MOCK_SESSION_ID,
                        },
                    })
                )
            })
        }
        // No actual popup window
        return undefined as unknown as Window
    })
}

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

// TODO make it regular exported const
const REMOTE_ORIGIN =
    (import.meta as ImportMeta & { env: { VITE_MOCK_REMOTE_URL?: string } }).env
        .VITE_MOCK_REMOTE_URL ?? 'http://127.0.0.1:13030'

const RPC_URL = REMOTE_ORIGIN + MOCK_DAPP_API_PATH
const PROVIDER_ID = 'remote:integration' as const
const RECENT_GATEWAYS_KEY = 'splice_wallet_picker_recent'

async function pushMockSseEvent(event: string, data: unknown): Promise<void> {
    const res = await fetch(`${REMOTE_ORIGIN}${MOCK_SSE_PUSH_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, data }),
    })
    if (!res.ok) throw new Error(`sse-push failed: ${res.status}`)
}

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
    beforeEach(() => {
        localStorage.clear()
        delete (window as Window & { canton?: unknown }).canton
        mockPopupOpen()
        vi.spyOn(popup, 'close').mockImplementation(() => undefined)
    })

    afterEach(() => {
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

    describe('disconnect', () => {
        it('delegates to provider.request', async () => {
            const { sdk, remote } = createIntegrationSdk()
            await sdk.connect({ defaultAdapters: [remote] })
            const provider = sdk.getConnectedProvider()!
            const requestSpy = vi.spyOn(provider, 'request')

            await sdk.disconnect()

            expect(requestSpy).toHaveBeenCalledWith({ method: 'disconnect' })
        })

        it('clears persisted kernel session and discovery from localStorage', async () => {
            const { sdk, remote } = createIntegrationSdk()
            await sdk.connect({ defaultAdapters: [remote] })
            expect(storage.getKernelSession()).toBeDefined()
            expect(storage.getKernelDiscovery()).toBeDefined()

            await sdk.disconnect()

            expect(storage.getKernelSession()).toBeUndefined()
            expect(storage.getKernelDiscovery()).toBeUndefined()
        })

        it('closes the wallet popup', async () => {
            const { sdk, remote } = createIntegrationSdk()
            await sdk.connect({ defaultAdapters: [remote] })
            vi.mocked(popup.close).mockClear()

            await sdk.disconnect()

            expect(popup.close).toHaveBeenCalled()
        })

        it('drops the active session so subsequent sdk calls throw', async () => {
            const { sdk, remote } = createIntegrationSdk()
            await sdk.connect({ defaultAdapters: [remote] })

            await sdk.disconnect()

            await expect(sdk.listAccounts()).rejects.toThrow(/Not connected/)
        })
    })

    describe('isConnected', () => {
        it('returns unauthenticated without hitting the provider when no client exists', async () => {
            const { sdk, remote } = createIntegrationSdk()
            const providerSpy = vi.spyOn(remote, 'provider')

            const result = await sdk.isConnected()

            expect(result).toEqual({
                isConnected: false,
                isNetworkConnected: false,
                reason: 'Unauthenticated',
                networkReason: 'Unauthenticated',
            })
            expect(providerSpy).not.toHaveBeenCalled()
        })

        it('delegates to provider.request when connected', async () => {
            const { sdk, remote } = createIntegrationSdk()
            await sdk.connect({ defaultAdapters: [remote] })
            const provider = sdk.getConnectedProvider()!
            const requestSpy = vi.spyOn(provider, 'request')

            const result = await sdk.isConnected()

            expect(requestSpy).toHaveBeenCalledWith({ method: 'isConnected' })
            expect(result.isConnected).toBe(true)

            await sdk.disconnect()
        })
    })

    it('listAccounts delegates to provider.request', async () => {
        const { sdk, remote } = createIntegrationSdk()
        await sdk.connect({ defaultAdapters: [remote] })
        const provider = sdk.getConnectedProvider()
        const requestSpy = vi.spyOn(provider, 'request')

        await sdk.listAccounts()

        expect(requestSpy).toHaveBeenCalledWith({ method: 'listAccounts' })

        await sdk.disconnect()
    })

    it.skip('getActiveNetwork delegates to provider.request', async () => {
        const { sdk, remote } = createIntegrationSdk()
        await sdk.connect({ defaultAdapters: [remote] })
        const provider = sdk.getConnectedProvider()
        const requestSpy = vi.spyOn(provider, 'request')

        // TODO make it sdk.getActiveNetwork once it's added to SDK
        await provider.request({ method: 'getActiveNetwork' })

        expect(requestSpy).toHaveBeenCalledWith({
            method: 'getActiveNetwork',
        })

        await sdk.disconnect()
    })

    it.skip('getPrimaryAccount delegates to provider.request', async () => {
        const { sdk, remote } = createIntegrationSdk()
        await sdk.connect({ defaultAdapters: [remote] })
        const provider = sdk.getConnectedProvider()!
        const requestSpy = vi.spyOn(provider, 'request')

        // TODO make it sdk.getPrimaryAccount once it's added to SDK
        await provider.request({ method: 'getPrimaryAccount' })

        expect(requestSpy).toHaveBeenCalledWith({
            method: 'getPrimaryAccount',
        })

        await sdk.disconnect()
    })

    it.skip('signMessage delegates to provider.request with params', async () => {
        const { sdk, remote } = createIntegrationSdk()
        await sdk.connect({ defaultAdapters: [remote] })
        const provider = sdk.getConnectedProvider()!
        const requestSpy = vi.spyOn(provider, 'request')
        const signMessageParams: SignMessageParams = {
            message: 'integration-sign-payload',
        }

        // TODO make it sdk.signMessage once it's added to SDK
        await provider.request({
            method: 'signMessage',
            params: signMessageParams,
        })

        expect(requestSpy).toHaveBeenCalledWith({
            method: 'signMessage',
            params: signMessageParams,
        })

        await sdk.disconnect()
    })

    describe('prepareExecute', () => {
        const prepareParams: PrepareExecuteParams = {
            commandId: 'prepare-execute-cmd',
            commands: { templateId: 'Template', choice: 'Choice' },
        }

        it('calls provider.request with method prepareExecute and the same params', async () => {
            const { sdk, remote } = createIntegrationSdk()
            await sdk.connect({ defaultAdapters: [remote] })
            const provider = sdk.getConnectedProvider()!
            const requestSpy = vi.spyOn(provider, 'request')

            await sdk.prepareExecute(prepareParams)

            expect(requestSpy).toHaveBeenCalledWith({
                method: 'prepareExecute',
                params: prepareParams,
            })

            await sdk.disconnect()
        })

        it('opens popup with userUrl returned from prepareExecute', async () => {
            const { sdk, remote } = createIntegrationSdk()
            await sdk.connect({ defaultAdapters: [remote] })
            vi.mocked(popup.open).mockClear()

            await sdk.prepareExecute(prepareParams)

            const expectedUserUrl = `${REMOTE_ORIGIN}${APPROVE_URL}`
            expect(popup.open).toHaveBeenCalledTimes(1)
            expect(popup.open).toHaveBeenCalledWith(expectedUserUrl)

            await sdk.disconnect()
        })
    })

    describe('prepareExecuteAndWait', () => {
        const commandId = 'prepare-execute-and-wait-cmd'
        const prepareParams: PrepareExecuteParams = {
            commandId,
            commands: { templateId: 'Template', choice: 'Choice' },
        }

        // TODO rely on something unique instead of count
        async function waitForTxWaitListener(
            provider: Provider<DappRpcTypes>,
            baseline: number
        ): Promise<void> {
            const deadline = Date.now() + 10_000
            while (Date.now() < deadline) {
                if (listenerCount(provider, 'txChanged') > baseline) {
                    return
                }
                await new Promise((r) => setTimeout(r, 5))
            }
            throw new Error(
                'timeout waiting for prepareExecuteAndWait txChanged listener'
            )
        }

        function executedFor(cmd: string): TxChangedExecutedEvent {
            return {
                status: 'executed',
                commandId: cmd,
                payload: { updateId: 'u', completionOffset: 0 },
            }
        }

        it('calls provider with prepareExecuteAndWait, opens approval URL, resolves when matching executed arrives', async () => {
            const { sdk, remote } = createIntegrationSdk()
            await sdk.connect({ defaultAdapters: [remote] })
            vi.mocked(popup.open).mockClear()

            const provider = sdk.getConnectedProvider()!
            const requestSpy = vi.spyOn(provider, 'request')
            const baseline = listenerCount(provider, 'txChanged')

            const waitPromise = sdk.prepareExecuteAndWait(prepareParams)
            await waitForTxWaitListener(provider, baseline)

            expect(requestSpy).toHaveBeenCalledWith({
                method: 'prepareExecuteAndWait',
                params: prepareParams,
            })
            expect(popup.open).toHaveBeenCalledWith(
                `${REMOTE_ORIGIN}${APPROVE_URL}`
            )

            await pushMockSseEvent('txChanged', executedFor('other-cmd'))
            await pushMockSseEvent('txChanged', executedFor(commandId))

            const executed = executedFor(commandId)
            await expect(waitPromise).resolves.toEqual({ tx: executed })

            await sdk.disconnect()
        })

        it('uses a non-empty commandId when none is passed (so the wait can match the flow)', async () => {
            const { sdk, remote } = createIntegrationSdk()
            await sdk.connect({ defaultAdapters: [remote] })
            const provider = sdk.getConnectedProvider()!
            // Outer provider.request({ prepareExecuteAndWait }) mirrors user params only,
            // the controller injects commandId on the inner prepareExecute
            const innerRequest = vi.spyOn(provider.remoteProvider, 'request')

            const params = { commands: { templateId: 'T', choice: 'C' } }
            const baseline = listenerCount(provider, 'txChanged')
            const waitPromise = sdk.prepareExecuteAndWait(params)
            await waitForTxWaitListener(provider, baseline)

            const lastPrepare = innerRequest.mock.calls.find(
                ([arg]) =>
                    (arg as { method?: string }).method === 'prepareExecute'
            )
            const generatedCommandId = (
                lastPrepare?.[0] as
                    | { params?: { commandId?: string } }
                    | undefined
            )?.params?.commandId

            expect(typeof generatedCommandId).toBe('string')
            // just for TS
            if (typeof generatedCommandId !== 'string')
                throw new Error('expected prepareExecute params.commandId')

            expect(generatedCommandId.length).toBeGreaterThan(0)

            await pushMockSseEvent('txChanged', executedFor(generatedCommandId))
            await waitPromise

            await sdk.disconnect()
        })

        it('rejects with TransactionFailed when txChanged is failed for that command', async () => {
            const { sdk, remote } = createIntegrationSdk()
            await sdk.connect({ defaultAdapters: [remote] })
            const provider = sdk.getConnectedProvider()!

            const baseline = listenerCount(provider, 'txChanged')
            const waitPromise = sdk.prepareExecuteAndWait(prepareParams)
            // Attach the rejection assertion synchronously so the rejection
            // from `waitPromise` isn't reported as unhandled while we set up
            // the SSE push below.
            const assertion = expect(waitPromise).rejects.toMatchObject({
                error: ErrorCode.TransactionFailed,
            })

            await waitForTxWaitListener(provider, baseline)
            await pushMockSseEvent('txChanged', {
                status: 'failed',
                commandId,
            })
            await assertion

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
