// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
    type Mock,
} from 'vitest'
import type {
    EventListener,
    Provider,
} from '@canton-network/core-splice-provider'
import type { ProviderAdapter } from '@canton-network/core-wallet-discovery'
import { errorCodes, JsonRpcError } from '@canton-network/core-rpc-errors'
import type {
    AccountsChangedEvent,
    ConnectResult,
    LedgerApiParams,
    LedgerApiResult,
    ListAccountsResult,
    MessageSignatureEvent,
    PrepareExecuteAndWaitResult,
    PrepareExecuteParams,
    RpcTypes as DappRpcTypes,
    SignMessageParams,
    SignMessageResult,
    StatusEvent,
    TxChangedEvent,
} from '@canton-network/core-wallet-dapp-rpc-client'
import * as storage from './storage'
import {
    DappSDK,
    connect,
    disconnect,
    getConnectedProvider,
    init,
    isConnected,
    ledgerApi,
    listAccounts,
    onAccountsChanged,
    onConnected,
    onMessageSignature,
    onStatusChanged,
    onTxChanged,
    open,
    prepareExecute,
    prepareExecuteAndWait,
    removeOnAccountsChanged,
    removeOnConnected,
    removeOnMessageSignature,
    removeOnStatusChanged,
    removeOnTxChanged,
    sdk,
    status,
} from './sdk'

const {
    mockRequestAnnouncedProviders,
    mockNotifyWalletPickerConnected,
    mockNotifyWalletPickerError,
    mockWaitForWalletPickerRetrySelection,
    mockClearAllLocalState,
    remoteAdapterInstances,
    RemoteAdapterMock,
    setRemoteProviderFactory,
} = vi.hoisted(() => {
    const remoteAdapterInstances: Array<{
        providerId: string
        rpcUrl: string
        name: string
        provider: ReturnType<typeof vi.fn>
    }> = []

    let createRemoteProvider: (() => unknown) | undefined

    const setRemoteProviderFactory = (factory: () => unknown) => {
        createRemoteProvider = factory
    }

    class RemoteAdapterMock {
        readonly providerId: string
        readonly name: string
        readonly type = 'remote' as const
        readonly rpcUrl: string
        readonly icon: string | undefined
        readonly provider: ReturnType<typeof vi.fn>
        readonly detect: ReturnType<typeof vi.fn>
        readonly teardown: ReturnType<typeof vi.fn>

        constructor(config: {
            providerId?: string | undefined
            rpcUrl: string
            name: string
            icon?: string | undefined
        }) {
            this.providerId = config.providerId ?? `remote:${config.rpcUrl}`
            this.name = config.name
            this.rpcUrl = config.rpcUrl
            this.icon = config.icon
            this.provider = vi.fn(() => {
                if (!createRemoteProvider) {
                    throw new Error('Remote provider factory not configured')
                }
                return createRemoteProvider()
            })
            this.detect = vi.fn().mockResolvedValue(true)
            this.teardown = vi.fn()
            remoteAdapterInstances.push({
                providerId: this.providerId,
                rpcUrl: this.rpcUrl,
                name: this.name,
                provider: this.provider,
            })
        }

        getInfo() {
            return {
                providerId: this.providerId,
                name: this.name,
                type: this.type,
                url: this.rpcUrl,
                reuseGlobalWalletPopup: true,
            }
        }
    }

    return {
        mockRequestAnnouncedProviders: vi.fn(),
        mockNotifyWalletPickerConnected: vi.fn(),
        mockNotifyWalletPickerError: vi.fn(),
        mockWaitForWalletPickerRetrySelection: vi.fn(),
        mockClearAllLocalState: vi.fn(),
        remoteAdapterInstances,
        RemoteAdapterMock,
        setRemoteProviderFactory,
    }
})

vi.mock('./announce-discovery', () => ({
    requestAnnouncedProviders: mockRequestAnnouncedProviders,
}))

vi.mock('./util', () => ({
    clearAllLocalState: mockClearAllLocalState,
}))

vi.mock('./adapter/remote-adapter', () => ({
    RemoteAdapter: RemoteAdapterMock,
}))

vi.mock('@canton-network/core-wallet-ui-components', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('@canton-network/core-wallet-ui-components')
        >()
    return {
        ...actual,
        notifyWalletPickerConnected: mockNotifyWalletPickerConnected,
        notifyWalletPickerError: mockNotifyWalletPickerError,
        waitForWalletPickerRetrySelection:
            mockWaitForWalletPickerRetrySelection,
    }
})

type MockProvider = {
    request: Mock<Provider<DappRpcTypes>['request']>
    on: Mock<Provider<DappRpcTypes>['on']>
    removeListener: Mock<Provider<DappRpcTypes>['removeListener']>
}

const prepareExecuteParams: PrepareExecuteParams = { commands: [] }
const signMessageParams: SignMessageParams = { message: 'hello' }
const ledgerApiParams: LedgerApiParams = {
    requestMethod: 'get',
    resource: '/v2/state',
}

const connectedStatus = (
    overrides: Partial<StatusEvent> = {}
): StatusEvent => ({
    provider: {
        id: 'remote:test',
        providerType: 'remote',
        url: 'https://gateway.test',
        userUrl: 'https://gateway.test/user',
    },
    connection: {
        isConnected: true,
        isNetworkConnected: true,
        reason: 'OK',
        networkReason: 'OK',
    },
    ...overrides,
})

const connectedResult = (): ConnectResult => connectedStatus().connection

const makeMockProvider = (
    overrides: Partial<MockProvider> = {}
): MockProvider => {
    const provider: MockProvider = {
        request: vi.fn(),
        on: vi.fn(),
        removeListener: vi.fn(),
        ...overrides,
    }

    provider.request.mockImplementation(async ({ method }) => {
        switch (method) {
            case 'connect':
                return connectedResult()
            case 'status':
                return connectedStatus()
            case 'isConnected':
                return connectedResult()
            case 'disconnect':
                return null
            case 'listAccounts':
                return [] satisfies ListAccountsResult
            case 'prepareExecute':
                return null
            case 'prepareExecuteAndWait':
                return {
                    tx: {
                        commandId: 'cmd-1',
                        status: 'executed',
                        payload: { updateId: '1', completionOffset: 1 },
                    },
                } satisfies PrepareExecuteAndWaitResult
            case 'signMessage':
                return { signature: 'signed' } satisfies SignMessageResult
            case 'ledgerApi':
                return { ok: true } satisfies LedgerApiResult
            default:
                throw new Error(`unexpected method ${String(method)}`)
        }
    })

    return provider
}

const asProvider = (mock: MockProvider): Provider<DappRpcTypes> =>
    mock as unknown as Provider<DappRpcTypes>

type MockAdapterOptions = {
    providerId?: string
    name?: string
    type?: 'remote' | 'browser'
    url?: string
    provider?: MockProvider
    detect?: boolean
}

const makeMockAdapter = (options: MockAdapterOptions = {}): ProviderAdapter => {
    const providerId = options.providerId ?? 'remote:test'
    const name = options.name ?? 'Test Wallet'
    const type = options.type ?? 'remote'
    const url = options.url ?? 'https://gateway.test'
    const mockProvider = options.provider ?? makeMockProvider()

    return {
        providerId,
        name,
        type,
        getInfo: () => ({
            providerId,
            name,
            type,
            url,
            reuseGlobalWalletPopup: false,
        }),
        detect: vi
            .fn<ProviderAdapter['detect']>()
            .mockResolvedValue(options.detect ?? true),
        provider: vi
            .fn<ProviderAdapter['provider']>()
            .mockReturnValue(asProvider(mockProvider)),
        teardown: vi.fn(),
    }
}

const makeListener = <T>(): EventListener<T> =>
    vi.fn<EventListener<T>>() as EventListener<T>

const getDiscovery = (sdk: DappSDK) =>
    (sdk as unknown as { discovery: { listAdapters(): ProviderAdapter[] } })
        .discovery

describe('DappSDK', () => {
    beforeEach(() => {
        localStorage.clear()
        remoteAdapterInstances.length = 0
        setRemoteProviderFactory(() => asProvider(makeMockProvider()))
        mockRequestAnnouncedProviders.mockResolvedValue([])
        mockWaitForWalletPickerRetrySelection.mockReset()
        mockNotifyWalletPickerConnected.mockReset()
        mockNotifyWalletPickerError.mockReset()
        mockClearAllLocalState.mockReset()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('disconnected state', () => {
        it('reports disconnected state when no client is active', async () => {
            const sdk = new DappSDK()

            await expect(sdk.isConnected()).resolves.toEqual({
                isConnected: false,
                isNetworkConnected: false,
                reason: 'Unauthenticated',
                networkReason: 'Unauthenticated',
            })
        })

        it('disconnects cleanly when not connected', async () => {
            const sdk = new DappSDK()

            await expect(sdk.disconnect()).resolves.toBeNull()
        })

        it('returns null when no provider session exists', () => {
            const sdk = new DappSDK()

            expect(sdk.getConnectedProvider()).toBeNull()
        })

        it('requires an active client for RPC helpers', async () => {
            const sdk = new DappSDK()

            for (const call of [
                () => sdk.status(),
                () => sdk.listAccounts(),
                () => sdk.prepareExecute(prepareExecuteParams),
                () => sdk.prepareExecuteAndWait(prepareExecuteParams),
                () => sdk.signMessage(signMessageParams),
                () => sdk.ledgerApi(ledgerApiParams),
                () => sdk.open(),
            ]) {
                const pending = call()
                await expect(pending).rejects.toBeInstanceOf(JsonRpcError)
                await expect(pending).rejects.toMatchObject({
                    code: errorCodes.provider.unauthorized,
                    message: 'Not connected — call connect() first',
                })
            }
        })

        it('ignores removeListener calls when no client is active', async () => {
            const sdk = new DappSDK()
            const statusListener = makeListener<StatusEvent>()
            const accountsListener = makeListener<AccountsChangedEvent>()
            const txListener = makeListener<TxChangedEvent>()
            const signatureListener = makeListener<MessageSignatureEvent>()

            await sdk.removeOnStatusChanged(statusListener)
            await sdk.removeOnAccountsChanged(accountsListener)
            await sdk.removeOnConnected(statusListener)
            await sdk.removeOnTxChanged(txListener)
            await sdk.removeOnMessageSignature(signatureListener)
        })
    })

    describe('init', () => {
        it('registers configured adapters and queries announced providers', async () => {
            const adapter = makeMockAdapter()
            const sdk = new DappSDK()

            await sdk.init({ defaultAdapters: [adapter] })

            expect(mockRequestAnnouncedProviders).toHaveBeenCalled()
            expect(getDiscovery(sdk).listAdapters()).toEqual(
                expect.arrayContaining([adapter])
            )
        })

        it('uses the persisted remote gateway URL when no options are passed', async () => {
            storage.setKernelDiscovery({
                walletType: 'remote',
                url: 'https://gateway.test',
            })

            const sdk = new DappSDK()
            await sdk.init()

            const adapterIds = getDiscovery(sdk)
                .listAdapters()
                .map((adapter) => adapter.providerId)
            expect(adapterIds).toContain('remote:https://gateway.test')
        })

        it('serializes concurrent init calls', async () => {
            const adapter = makeMockAdapter()
            const sdk = new DappSDK()

            await Promise.all([
                sdk.init({ defaultAdapters: [adapter] }),
                sdk.init({ defaultAdapters: [adapter] }),
            ])

            expect(getDiscovery(sdk).listAdapters()).toHaveLength(1)
        })
    })

    describe('connect', () => {
        it('connects through the wallet picker and persists remote discovery', async () => {
            const adapter = makeMockAdapter()
            const sdk = new DappSDK({
                walletPicker: async () => ({
                    providerId: 'remote:test',
                    name: 'Test Wallet',
                    type: 'remote',
                }),
            })

            await sdk.init({ defaultAdapters: [adapter] })
            await expect(sdk.connect()).resolves.toEqual(connectedResult())

            expect(mockClearAllLocalState).toHaveBeenCalled()
            expect(mockNotifyWalletPickerConnected).toHaveBeenCalledWith(false)
            expect(storage.getKernelDiscovery()).toEqual({
                walletType: 'remote',
                url: 'https://gateway.test',
            })
            expect(
                JSON.parse(
                    localStorage.getItem('splice_wallet_picker_recent') ?? '[]'
                )
            ).toEqual([{ name: 'Test Wallet', rpcUrl: 'https://gateway.test' }])
            expect(sdk.getConnectedProvider()).toBe(adapter.provider())
        })

        it('registers a dynamic remote adapter for custom gateway URLs', async () => {
            const provider = makeMockProvider()
            setRemoteProviderFactory(() => asProvider(provider))
            const sdk = new DappSDK({
                walletPicker: async () => ({
                    providerId: 'custom-entry',
                    name: 'Custom Gateway',
                    type: 'remote',
                    url: 'https://custom.gateway.test',
                }),
            })

            await sdk.init({ defaultAdapters: [] })
            await sdk.connect()

            expect(remoteAdapterInstances).toEqual([
                expect.objectContaining({
                    providerId: 'remote:https://custom.gateway.test',
                    rpcUrl: 'https://custom.gateway.test',
                    name: 'Custom Gateway',
                }),
            ])
            expect(provider.request).toHaveBeenCalledWith(
                expect.objectContaining({ method: 'connect' })
            )
        })

        it('retries after a connection failure and appends HTTP status details', async () => {
            const provider = makeMockProvider()
            let connectCalls = 0
            const defaultProvider = makeMockProvider()
            provider.request.mockImplementation(async (args) => {
                if (args.method === 'connect') {
                    connectCalls += 1
                    if (connectCalls === 1) {
                        throw Object.assign(new Error('Gateway unavailable'), {
                            status: 503,
                        })
                    }
                }
                return defaultProvider.request(args)
            })

            const adapter = makeMockAdapter({ provider })
            mockWaitForWalletPickerRetrySelection.mockResolvedValue({
                providerId: 'remote:test',
                name: 'Test Wallet',
                type: 'remote',
            })

            const sdk = new DappSDK({
                walletPicker: async () => ({
                    providerId: 'remote:test',
                    name: 'Test Wallet',
                    type: 'remote',
                }),
            })

            await sdk.init({ defaultAdapters: [adapter] })
            await expect(sdk.connect()).resolves.toEqual(connectedResult())

            expect(mockNotifyWalletPickerError).toHaveBeenCalledWith(
                'Gateway unavailable (HTTP 503)'
            )
            expect(connectCalls).toBe(2)
        })

        it('rejects when the user cancels the retry picker', async () => {
            const provider = makeMockProvider()
            provider.request.mockImplementation(async (args) => {
                if (args.method === 'connect') {
                    throw new Error('User rejected')
                }
                return makeMockProvider().request(args)
            })

            const adapter = makeMockAdapter({ provider })
            const retryError = new Error('User cancelled')
            mockWaitForWalletPickerRetrySelection.mockRejectedValue(retryError)

            const sdk = new DappSDK({
                walletPicker: async () => ({
                    providerId: 'remote:test',
                    name: 'Test Wallet',
                    type: 'remote',
                }),
            })

            await sdk.init({ defaultAdapters: [adapter] })
            await expect(sdk.connect()).rejects.toThrow('User cancelled')
        })

        it('supports the deprecated connect(options) entrypoint', async () => {
            const adapter = makeMockAdapter()
            const sdk = new DappSDK({
                walletPicker: async () => ({
                    providerId: 'remote:test',
                    name: 'Test Wallet',
                    type: 'remote',
                }),
            })

            await expect(
                sdk.connect({ defaultAdapters: [adapter] })
            ).resolves.toEqual(connectedResult())
        })
    })

    describe('connected client delegation', () => {
        const connectSdk = async (
            providerOverrides: Partial<MockProvider> = {}
        ) => {
            const provider = makeMockProvider(providerOverrides)
            const adapter = makeMockAdapter({ provider })
            const sdk = new DappSDK({
                walletPicker: async () => ({
                    providerId: 'remote:test',
                    name: 'Test Wallet',
                    type: 'remote',
                }),
            })

            await sdk.init({ defaultAdapters: [adapter] })
            await sdk.connect()
            return { sdk, provider, adapter }
        }

        it('delegates RPC helpers to the active client', async () => {
            const { sdk, provider } = await connectSdk()

            await expect(sdk.status()).resolves.toEqual(connectedStatus())
            await expect(sdk.listAccounts()).resolves.toEqual([])
            await expect(
                sdk.prepareExecute(prepareExecuteParams)
            ).resolves.toBeNull()
            await expect(
                sdk.prepareExecuteAndWait(prepareExecuteParams)
            ).resolves.toEqual({
                tx: {
                    commandId: 'cmd-1',
                    status: 'executed',
                    payload: { updateId: '1', completionOffset: 1 },
                },
            })
            await expect(sdk.signMessage(signMessageParams)).resolves.toEqual({
                signature: 'signed',
            })
            await expect(sdk.ledgerApi(ledgerApiParams)).resolves.toEqual({
                ok: true,
            })
            await expect(sdk.isConnected()).resolves.toEqual(connectedResult())
            await sdk.open()
            await sdk.disconnect()

            expect(provider.request).toHaveBeenCalledWith(
                expect.objectContaining({ method: 'status' })
            )
            expect(provider.request).toHaveBeenCalledWith(
                expect.objectContaining({ method: 'disconnect' })
            )
        })

        it('registers and removes event listeners on the active client', async () => {
            const { sdk, provider } = await connectSdk()
            const statusListener = makeListener<StatusEvent>()
            const accountsListener = makeListener<AccountsChangedEvent>()
            const txListener = makeListener<TxChangedEvent>()
            const signatureListener = makeListener<MessageSignatureEvent>()

            await sdk.onStatusChanged(statusListener)
            await sdk.onAccountsChanged(accountsListener)
            await sdk.onConnected(statusListener)
            await sdk.onTxChanged(txListener)
            await sdk.onMessageSignature(signatureListener)

            expect(provider.on).toHaveBeenCalledWith(
                'statusChanged',
                statusListener
            )
            expect(provider.on).toHaveBeenCalledWith(
                'accountsChanged',
                accountsListener
            )
            expect(provider.on).toHaveBeenCalledWith(
                'messageSignature',
                signatureListener
            )

            await sdk.removeOnStatusChanged(statusListener)
            await sdk.removeOnAccountsChanged(accountsListener)
            await sdk.removeOnConnected(statusListener)
            await sdk.removeOnTxChanged(txListener)
            await sdk.removeOnMessageSignature(signatureListener)

            expect(provider.removeListener).toHaveBeenCalledWith(
                'statusChanged',
                statusListener
            )
            expect(provider.removeListener).toHaveBeenCalledWith(
                'accountsChanged',
                accountsListener
            )
        })
    })

    it('exposes detached helper functions from sdk object', async () => {
        const statusListener = makeListener<StatusEvent>()
        const accountsListener = makeListener<AccountsChangedEvent>()
        const txListener = makeListener<TxChangedEvent>()
        const signatureListener = makeListener<MessageSignatureEvent>()

        const initSpy = vi.spyOn(sdk, 'init').mockResolvedValue()
        const connectSpy = vi
            .spyOn(sdk, 'connect')
            .mockResolvedValue(connectedResult())
        const disconnectSpy = vi
            .spyOn(sdk, 'disconnect')
            .mockResolvedValue(null)
        const isConnectedSpy = vi
            .spyOn(sdk, 'isConnected')
            .mockResolvedValue(connectedResult())
        const getConnectedProviderSpy = vi
            .spyOn(sdk, 'getConnectedProvider')
            .mockReturnValue(null)
        const statusSpy = vi
            .spyOn(sdk, 'status')
            .mockResolvedValue(connectedStatus())
        const listAccountsSpy = vi
            .spyOn(sdk, 'listAccounts')
            .mockResolvedValue([])
        const prepareExecuteSpy = vi
            .spyOn(sdk, 'prepareExecute')
            .mockResolvedValue(null)
        const prepareExecuteAndWaitSpy = vi
            .spyOn(sdk, 'prepareExecuteAndWait')
            .mockResolvedValue({
                tx: {
                    commandId: 'cmd-1',
                    status: 'executed',
                    payload: { updateId: '1', completionOffset: 1 },
                },
            })
        const ledgerApiSpy = vi
            .spyOn(sdk, 'ledgerApi')
            .mockResolvedValue({ ok: true })
        const openSpy = vi.spyOn(sdk, 'open').mockResolvedValue()
        const onStatusChangedSpy = vi
            .spyOn(sdk, 'onStatusChanged')
            .mockResolvedValue()
        const onAccountsChangedSpy = vi
            .spyOn(sdk, 'onAccountsChanged')
            .mockResolvedValue()
        const onConnectedSpy = vi.spyOn(sdk, 'onConnected').mockResolvedValue()
        const onTxChangedSpy = vi.spyOn(sdk, 'onTxChanged').mockResolvedValue()
        const onMessageSignatureSpy = vi
            .spyOn(sdk, 'onMessageSignature')
            .mockResolvedValue()
        const removeOnStatusChangedSpy = vi
            .spyOn(sdk, 'removeOnStatusChanged')
            .mockResolvedValue()
        const removeOnAccountsChangedSpy = vi
            .spyOn(sdk, 'removeOnAccountsChanged')
            .mockResolvedValue()
        const removeOnConnectedSpy = vi
            .spyOn(sdk, 'removeOnConnected')
            .mockResolvedValue()
        const removeOnTxChangedSpy = vi
            .spyOn(sdk, 'removeOnTxChanged')
            .mockResolvedValue()
        const removeOnMessageSignatureSpy = vi
            .spyOn(sdk, 'removeOnMessageSignature')
            .mockResolvedValue()

        await init()
        expect(initSpy).toHaveBeenCalled()

        await connect()
        expect(connectSpy).toHaveBeenCalled()

        await disconnect()
        expect(disconnectSpy).toHaveBeenCalled()

        await isConnected()
        expect(isConnectedSpy).toHaveBeenCalled()

        getConnectedProvider()
        expect(getConnectedProviderSpy).toHaveBeenCalled()

        await status()
        expect(statusSpy).toHaveBeenCalled()

        await listAccounts()
        expect(listAccountsSpy).toHaveBeenCalled()

        await prepareExecute(prepareExecuteParams)
        expect(prepareExecuteSpy).toHaveBeenCalledWith(prepareExecuteParams)

        await prepareExecuteAndWait(prepareExecuteParams)
        expect(prepareExecuteAndWaitSpy).toHaveBeenCalledWith(
            prepareExecuteParams
        )

        await ledgerApi(ledgerApiParams)
        expect(ledgerApiSpy).toHaveBeenCalledWith(ledgerApiParams)

        await open()
        expect(openSpy).toHaveBeenCalled()

        await onStatusChanged(statusListener)
        expect(onStatusChangedSpy).toHaveBeenCalledWith(statusListener)

        await onAccountsChanged(accountsListener)
        expect(onAccountsChangedSpy).toHaveBeenCalledWith(accountsListener)

        await onConnected(statusListener)
        expect(onConnectedSpy).toHaveBeenCalledWith(statusListener)

        await onTxChanged(txListener)
        expect(onTxChangedSpy).toHaveBeenCalledWith(txListener)

        await onMessageSignature(signatureListener)
        expect(onMessageSignatureSpy).toHaveBeenCalledWith(signatureListener)

        await removeOnStatusChanged(statusListener)
        expect(removeOnStatusChangedSpy).toHaveBeenCalledWith(statusListener)

        await removeOnAccountsChanged(accountsListener)
        expect(removeOnAccountsChangedSpy).toHaveBeenCalledWith(
            accountsListener
        )

        await removeOnConnected(statusListener)
        expect(removeOnConnectedSpy).toHaveBeenCalledWith(statusListener)

        await removeOnTxChanged(txListener)
        expect(removeOnTxChangedSpy).toHaveBeenCalledWith(txListener)

        await removeOnMessageSignature(signatureListener)
        expect(removeOnMessageSignatureSpy).toHaveBeenCalledWith(
            signatureListener
        )
    })
})
