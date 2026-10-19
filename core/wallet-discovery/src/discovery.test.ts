// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    DiscoveryError,
    NotConnectedError,
    SessionExpiredError,
    TimeoutError,
    UserRejectedError,
    WalletNotFoundError,
    WalletNotInstalledError,
} from './errors.js'
import { DiscoveryClient } from './client.js'

/* oxlint-disable typescript/no-explicit-any */
const {
    mockLoadPersistedSession,
    mockPersistSession,
    mockClearPesristedSession,
} = vi.hoisted(() => ({
    mockLoadPersistedSession: vi.fn().mockReturnValue(null),
    mockPersistSession: vi.fn(),
    mockClearPesristedSession: vi.fn(),
}))

vi.mock('./storage', () => ({
    persistSession: mockPersistSession,
    loadPersistedSession: mockLoadPersistedSession,
    clearPersistedSession: mockClearPesristedSession,
}))

const makeProvider = (overrides: Record<string, unknown> = {}) => ({
    request: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    ...overrides,
})

vi.mock('@canton-network/core-wallet-dapp-rpc-client', () => ({}))

const makeAdapter = (
    providerId = 'provider-id-wallet-1',
    overrides: Record<string, unknown> = {}
) => {
    const provider = makeProvider()
    return {
        providerId,
        getInfo: vi.fn().mockReturnValue({
            providerId,
            name: `${providerId} Wallet`,
            type: 'injected',
            description: 'test wallet',
            icon: undefined,
            url: undefined,
            reuseGlobalWalletPopup: false,
        }),
        provider: vi.fn().mockReturnValue(provider),
        restore: vi.fn().mockResolvedValue(null),
        teardown: vi.fn(),
        _provider: provider,
        ...overrides,
    }
}

const makeClient = async (
    options: {
        adapters?: ReturnType<typeof makeAdapter>[]
        walletPicker?: (...args: unknown[]) => Promise<{ providerId: string }>
    } = {}
) => {
    const client = await DiscoveryClient.create({
        adapters: options.adapters as any,
        walletPicker: options.walletPicker as any,
    })

    return client
}

const connectClient = async (
    client: DiscoveryClient,
    providerId = 'test-wallet'
) => {
    await client.connect(providerId as any)
    return client
}

describe('DiscoveryClient', () => {
    beforeEach(() => {
        mockLoadPersistedSession.mockReturnValue(null)
    })

    describe('should create and initialize DiscoveryClient', () => {
        it('creates a client with no adapters registered when non are configured', async () => {
            const client = await makeClient()
            expect(client.listAdapters()).toHaveLength(0)
        })

        it('creates a client with adapters from config', async () => {
            const adapter1 = makeAdapter('wallet-1')
            const adapter2 = makeAdapter('wallet-2')

            const client = await makeClient({ adapters: [adapter1, adapter2] })
            expect(client.listAdapters()).toHaveLength(2)
        })

        it('attempts session restore on creation', async () => {
            await makeClient()
            expect(mockLoadPersistedSession).toHaveBeenCalled()
        })

        it('has no active session when no persisted session exists', async () => {
            const client = await makeClient()
            expect(client.getActiveSession()).toBeNull()
        })
    })

    describe('session restore', () => {
        it('restores session when persisted session exists ', async () => {
            const adapter = makeAdapter('wallet-a')
            const restoredProvider = makeProvider()

            adapter.restore = vi.fn().mockResolvedValue(restoredProvider)
            mockLoadPersistedSession.mockReturnValue({ providerId: 'wallet-a' })
            const client = await makeClient({ adapters: [adapter] })

            const session = client.getActiveSession()
            expect(session).not.toBeNull()
            expect(session!.provider).toBe(restoredProvider)
            expect(session!.providerId).toBe('wallet-a')
        })

        it(`clears persisted session when restore() returns null`, async () => {
            const adapter = makeAdapter('wallet-a')
            adapter.restore = vi.fn().mockResolvedValue(null)
            mockLoadPersistedSession.mockReturnValue({ providerId: 'wallet-a' })
            await makeClient({ adapters: [adapter] })
            expect(mockClearPesristedSession).toHaveBeenCalled()
        })

        it(`clears persisted session when restore() rejects and doesn't rethrow the error`, async () => {
            const adapter = makeAdapter('wallet-a')
            adapter.restore = vi
                .fn()
                .mockRejectedValue(new Error('restore failed'))
            mockLoadPersistedSession.mockReturnValue({ providerId: 'wallet-a' })
            await makeClient({ adapters: [adapter] })
            expect(mockClearPesristedSession).toHaveBeenCalled()
        })

        it(`skips restore when persisted providerId doesn't have a registed adapter`, async () => {
            mockLoadPersistedSession.mockReturnValue({ providerId: 'unknown' })
            const client = await makeClient({
                adapters: [makeAdapter('wallet-a')],
            })
            expect(client.getActiveSession()).toBeNull()
        })
        it('clears persisted session when restore returns null', async () => {
            const adapter = makeAdapter('wallet-a')
            adapter.restore = vi.fn().mockResolvedValue(null)
            mockLoadPersistedSession.mockReturnValue({ providerId: 'wallet-a' })

            await makeClient({ adapters: [adapter] })
            expect(mockClearPesristedSession).toHaveBeenCalled()
        })
    })

    describe('restore persisted session if needed', () => {
        it('is a no op when a session already exists', async () => {
            const adapter = makeAdapter('wallet-a')
            const client = await makeClient({ adapters: [adapter] })
            await connectClient(client, 'wallet-a')

            const sessionBefore = client.getActiveSession()
            await client.restorePersistedSessionIfNeeded()
            expect(client.getActiveSession()).toBe(sessionBefore)
            expect(mockLoadPersistedSession).toHaveBeenCalledOnce()
        })
    })

    describe('register adapter and list wallets', () => {
        it('adds a new adapter', async () => {
            const adapter = makeAdapter('wallet-a')
            const client = await makeClient({ adapters: [adapter] })
            client.registerAdapter(makeAdapter('wallet-b') as any)
            expect(client.listAdapters()).toHaveLength(2)
        })

        it('overwrites adapter with same id', async () => {
            const adapter = makeAdapter('wallet-a')
            const client = await makeClient({ adapters: [adapter] })
            client.registerAdapter(makeAdapter('wallet-a') as any)
            expect(client.listAdapters()).toHaveLength(1)
        })

        it('returns wallet info for each registered adapter', async () => {
            const adapter = makeAdapter('wallet-a')
            const client = await makeClient({ adapters: [adapter] })
            client.registerAdapter(makeAdapter('wallet-b') as any)
            const wallets = client.listWallets()
            expect(wallets).toHaveLength(2)
            expect(wallets.map((w) => w.providerId)).toEqual(
                expect.arrayContaining(['wallet-a', 'wallet-b'])
            )
        })
    })

    describe('connect', () => {
        it('connects when given a providerId', async () => {
            const adapter = makeAdapter('wallet-a')
            const client = await makeClient({ adapters: [adapter] })
            await client.connect('wallet-a')
            expect(adapter.provider).toHaveBeenCalled()
            expect(adapter._provider.request).toHaveBeenCalledWith({
                method: 'connect',
            })
        })

        it('sets active session after connecting ', async () => {
            const adapter = makeAdapter('wallet-a')
            const client = await makeClient({ adapters: [adapter] })
            await client.connect('wallet-a')

            const session = client.getActiveSession()
            expect(session).not.toBeNull()
            expect(session!.providerId).toBe('wallet-a')
            expect(session!.adapter).toBe(adapter)
            expect(mockPersistSession).toHaveBeenCalledWith('wallet-a')
        })

        it('emits discovery:connected after connecting ', async () => {
            const adapter = makeAdapter('wallet-a')
            const client = await makeClient({ adapters: [adapter] })
            const handler = vi.fn()
            client.on('discovery:connected', handler)
            await client.connect('wallet-a')

            expect(handler).toHaveBeenCalledWith({ providerId: 'wallet-a' })
        })

        it('opens wallet picker if no providerId is given ', async () => {
            const adapter = makeAdapter('wallet-a')
            const picker = vi.fn().mockResolvedValue({ providerId: 'wallet-a' })
            const client = await makeClient({
                adapters: [adapter],
                walletPicker: picker,
            })

            await client.connect()

            expect(picker).toHaveBeenCalled()
            expect(client.getActiveSession()?.providerId).toBe('wallet-a')
        })

        it('throw a DiscoveryError when no providerId is selected from the adapter', async () => {
            const adapter = makeAdapter('wallet-a')
            const client = await makeClient({ adapters: [adapter] })

            await expect(client.connect('wallet-b')).rejects.toThrow(
                DiscoveryError
            )
        })

        it('emits discovery:error and rethrows provider.request() error', async () => {
            const adapter = makeAdapter('wallet-a')
            const error = new Error('connection refused')
            adapter._provider.request.mockRejectedValue(error)

            const client = await makeClient({ adapters: [adapter] })
            const errorHandler = vi.fn()
            client.on('discovery:error', errorHandler)

            await expect(client.connect('wallet-a')).rejects.toThrow(
                'connection refused'
            )
            expect(errorHandler).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'connection refused' })
            )
        })
    })

    describe('disconnect', () => {
        it('noop when not connected', async () => {
            const adapter = makeAdapter('wallet-a')
            const client = await makeClient({ adapters: [adapter] })
            await expect(client.disconnect()).resolves.toBeUndefined()
        })

        it('calls provider.request disconnect method', async () => {
            const adapter = makeAdapter('wallet-a')
            const client = await makeClient({ adapters: [adapter] })
            await connectClient(client, 'wallet-a')

            await client.disconnect()
            expect(adapter._provider.request).toHaveBeenCalledWith({
                method: 'disconnect',
            })
            expect(adapter.teardown).toHaveBeenCalled()
            expect(client.getActiveSession()).toBeNull()
        })
    })

    describe('events', () => {
        it('on returns unscribe function to stop future events', async () => {
            const adapter = makeAdapter('wallet-a')
            const client = await makeClient({ adapters: [adapter] })

            const handler = vi.fn()
            const unsub = client.on('discovery:connected', handler)

            unsub()
            await connectClient(client, 'wallet-a')
            expect(handler).not.toHaveBeenCalled()
        })

        it('removes listener to stop specific handler', async () => {
            const adapter = makeAdapter('wallet-a')
            const client = await makeClient({ adapters: [adapter] })
            const handler = vi.fn()
            client.on('discovery:connected', handler)
            client.removeListener('discovery:connected', handler)

            await connectClient(client, 'wallet-a')
            expect(handler).not.toHaveBeenCalled()
        })

        it('removes listener to stop specific handler but other handles still work', async () => {
            const adapter = makeAdapter('wallet-a')
            const client = await makeClient({ adapters: [adapter] })
            const handler = vi.fn()
            const handler2 = vi.fn()
            client.on('discovery:connected', handler)
            client.on('discovery:connected', handler2)
            client.removeListener('discovery:connected', handler)

            await connectClient(client, 'wallet-a')
            expect(handler).not.toHaveBeenCalled()
            expect(handler2).toHaveBeenCalledOnce()
        })
    })

    describe('destroy', () => {
        it('clears all active sessions', async () => {
            const adapter = makeAdapter('wallet-a')
            const client = await makeClient({ adapters: [adapter] })

            await connectClient(client, 'wallet-a')

            client.destroy()
            expect(client.getActiveSession()).toBeNull()
        })
    })

    describe('errors classe', () => {
        it('all the errors are represented with correct codes and mesages', () => {
            const err = new WalletNotFoundError('my-wallet')
            expect(err.code).toBe('WALLET_NOT_FOUND')
            expect(err.message).toContain(`Provider "my-wallet" not found`)

            const err2 = new WalletNotInstalledError('my-wallet')
            expect(err2.code).toBe('WALLET_NOT_INSTALLED')
            expect(err2.message).toBe(
                `Provider "my-wallet" is not installed or unavailable`
            )

            const err3 = new UserRejectedError()
            expect(err3.code).toBe('USER_REJECTED')
            expect(err3.message).toBe('User rejected the request')

            const err4 = new SessionExpiredError()
            expect(err4.code).toBe('SESSION_EXPIRED')
            expect(err4.message).toBe('Session has expired, please reconnect')

            const err5 = new TimeoutError('connect', 1000)
            expect(err5.code).toBe('TIMEOUT')
            expect(err5.message).toBe(`connect timed out after 1000ms`)

            const err6 = new NotConnectedError()
            expect(err6.code).toBe('NOT_CONNECTED')
            expect(err6.message).toBe('No active wallet connection')
        })
    })
})
