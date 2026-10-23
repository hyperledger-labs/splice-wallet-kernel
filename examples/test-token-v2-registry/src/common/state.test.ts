// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { RegistryState, type RegistryConfig, defaultConfig } from './state'
import {
    afterAll,
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest'

const mocks = vi.hoisted(() => {
    const fetch = vi
        .fn()
        .mockRejectedValue(
            new Error('RegistryState unit tests must not make network requests')
        )
    vi.stubGlobal('fetch', fetch)

    const execute = vi.fn().mockResolvedValue({ result: 'success' })
    const sign = vi.fn().mockReturnValue({
        execute,
    })
    const create = vi.fn().mockReturnValue({
        sign,
    })

    const externalParty = {
        create,
    }

    const party = {
        external: externalParty,
    }

    const generate = vi.fn().mockReturnValue({
        publicKey: 'test-public-key',
        privateKey: 'test-private-key',
    })

    const keys = {
        generate,
    }

    const mockSdk = {
        keys,
        party,
    }

    return {
        fetch,
        mockSdk,
        generate,
        create,
        sign,
        execute,
    }
})

vi.mock('./defaultSdk', () => {
    return {
        default: mocks.mockSdk,
    }
})

describe('RegistryState', () => {
    afterAll(() => {
        vi.unstubAllGlobals()
    })

    beforeEach(() => {
        // Reset the singleton instance before each test
        RegistryState['_instance'] = null
    })

    afterEach(() => {
        RegistryState['_instance'] = null
        expect(mocks.fetch).not.toHaveBeenCalled()
    })

    describe('instantiate', () => {
        it('should create a singleton instance with provided config', async () => {
            const config: Partial<RegistryConfig> = {
                port: 8080,
                synchronizerId: 'sync',
            }

            await RegistryState.instantiate(config)
            const instance = RegistryState.instance

            expect(instance).toBeDefined()
            expect(instance.port).toBe(8080)
            expect(instance.synchronizerId).toBe('sync')
        })

        it('should merge provided config with defaults', async () => {
            const config: Partial<RegistryConfig> = {
                port: 9000,
            }

            await RegistryState.instantiate(config)
            const instance = RegistryState.instance

            expect(instance.port).toBe(9000)
            expect(instance.synchronizerId).toEqual(
                defaultConfig.synchronizerId
            )
        })

        it('should create a party if operator.party is not provided', async () => {
            const keysResult = {
                publicKey: 'test-public-key',
                privateKey: 'test-private-key',
            }
            mocks.generate.mockReturnValueOnce(keysResult)

            await RegistryState.instantiate({
                port: 5634,
            })

            expect(mocks.create).toHaveBeenCalledWith('test-public-key', {
                partyHint: 'operator',
            })
            expect(mocks.sign).toHaveBeenCalledWith('test-private-key')
            expect(mocks.execute).toHaveBeenCalled()
        })

        it('should not create a party if operator.party is already provided', async () => {
            const providedKeys = {
                publicKey: 'provided-pub-key',
                privateKey: 'provided-priv-key',
            }

            await RegistryState.instantiate({
                operator: {
                    party: 'existing-party',
                    keys: providedKeys,
                },
            })

            expect(mocks.create).not.toHaveBeenCalled()
            expect(mocks.sign).not.toHaveBeenCalled()
            expect(mocks.execute).not.toHaveBeenCalled()
        })

        it('should handle party creation errors', async () => {
            const error = new Error('Failed to create party')
            mocks.execute.mockRejectedValueOnce(error)

            await expect(RegistryState.instantiate({})).rejects.toThrow(
                'Failed to create party'
            )
        })
    })

    describe('instance getter', () => {
        it('should throw error when accessing instance before instantiation', () => {
            expect(() => RegistryState.instance).toThrow(
                'must be instantiated first'
            )
        })

        it('should return the singleton instance after instantiation', async () => {
            await RegistryState.instantiate({ port: 7000 })

            const instance1 = RegistryState.instance
            const instance2 = RegistryState.instance

            expect(instance1).toBe(instance2)
            expect(instance1.port).toBe(7000)
        })
    })

    describe('reset', () => {
        it('should preserve exported defaults when instance data mutates', async () => {
            await RegistryState.instantiate({
                port: 8000,
                synchronizerId: 'sync',
            })

            const instance = RegistryState.instance
            instance.operator.party = 'mutated-party'

            expect(defaultConfig.operator.party).toBe('')
            expect(instance.operator.party).toBe('mutated-party')
        })

        it('should reset instance to default config', async () => {
            await RegistryState.instantiate({
                port: 8000,
                synchronizerId: 'sync',
            })

            const instance = RegistryState.instance
            instance.reset()

            expect(instance.port).toBe(defaultConfig.port)
            expect(instance.synchronizerId).toEqual(
                defaultConfig.synchronizerId
            )
        })

        it('should preserve singleton reference after reset', async () => {
            await RegistryState.instantiate({ port: 9500 })

            const instance1 = RegistryState.instance
            instance1.reset()
            const instance2 = RegistryState.instance

            expect(instance1).toBe(instance2)
            expect(instance2.port).toBe(defaultConfig.port)
        })
    })

    describe('default config', () => {
        it('should have expected default values', () => {
            expect(defaultConfig.port).toBe(5635)
            expect(defaultConfig.synchronizerId).toBe('')
            expect(defaultConfig.operator.party).toBe('')
            expect(defaultConfig.operator.keys).toBeDefined()
        })
    })

    describe('config properties', () => {
        it('should allow reading and writing to config properties', async () => {
            await RegistryState.instantiate({
                port: 3000,
            })

            const instance = RegistryState.instance

            instance.port = 4000
            expect(instance.port).toBe(4000)

            instance.synchronizerId = 'sync'
            expect(instance.synchronizerId).toBe('sync')
        })
    })

    describe('operator keys generation', () => {
        it('should initialize with default operator keys', async () => {
            await RegistryState.instantiate({})
            const instance = RegistryState.instance

            expect(instance.operator).toBeDefined()
            expect(instance.operator.keys).toBeDefined()
            expect(instance.operator.keys.publicKey).toBeDefined()
            expect(instance.operator.keys.privateKey).toBeDefined()
        })

        it('should use provided operator keys', async () => {
            const customKeys = {
                publicKey: 'custom-pub',
                privateKey: 'custom-priv',
            }

            await RegistryState.instantiate({
                operator: {
                    party: 'test-party',
                    keys: customKeys,
                },
            })

            const instance = RegistryState.instance
            expect(instance.operator.keys).toEqual(customKeys)
        })
    })
})
