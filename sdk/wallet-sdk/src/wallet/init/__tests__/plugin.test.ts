// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EXTENDED_SDK_OPTION_KEYS, SDKPlugin, type SDKPluginContext } from '../'
import * as mock from '../../__tests__/mocks'
import { SDK } from '../..'

const testPluginFactory = <T extends string>(key: T) => {
    return vi.fn(
        class extends SDKPlugin<T> {
            constructor(ctx: SDKPluginContext) {
                super(key, ctx)
            }
        }
    )
}

const createTestSDK = async () => {
    // Mock the authenticated user response
    mock.ledgerProvider.request.mockResolvedValueOnce({
        user: { id: 'test-user-id' },
    })

    return await SDK.create({
        ledgerProvider: mock.ledgerProvider as never,
    })
}

describe('plugin', () => {
    beforeEach(() => {})

    EXTENDED_SDK_OPTION_KEYS.forEach((key) => {
        it(`should throw error if ${key} is used as a name`, () => {
            expect(
                () => new (testPluginFactory(key))(mock.ctx as never)
            ).toThrow()
        })
    })

    it('should ensure type safety', async () => {
        const objectSdk = await createTestSDK()
        const arraySdk = await createTestSDK()

        const TestPlugin = testPluginFactory('plugin')

        const UntypedTestPlugin = testPluginFactory<string>('untyped')

        const objectRegistration = objectSdk.registerPlugins({
            plugin: TestPlugin,
            untyped: UntypedTestPlugin,
        })
        const arrayRegistration = arraySdk.registerPlugins([TestPlugin])

        // @ts-expect-error array based registration must not allow untyped plugins
        arraySdk.registerPlugins([UntypedTestPlugin])

        void (objectRegistration.plugin.name satisfies 'plugin')
        void (arrayRegistration.plugin.name satisfies 'plugin')

        void objectRegistration.plugin
        void objectRegistration.untyped
        void arrayRegistration.plugin

        // @ts-expect-error plugin2 must not be exposed by object registration
        void objectRegistration.plugin2

        // @ts-expect-error plugin2 must not be exposed by array registration
        void arrayRegistration.plugin2
    })

    describe('record based registration (deprecated)', () => {
        it('should call a plugin constructor when registering', async () => {
            const sdk = await createTestSDK()
            const TestPlugin = testPluginFactory('plugin')

            sdk.registerPlugins({
                plugin: TestPlugin,
            })

            expect(TestPlugin).toHaveBeenCalledOnce()
        })

        it('should successfully register a plugin under provided name', async () => {
            const sdk = await createTestSDK()
            const TestPlugin = testPluginFactory('plugin')
            const SDKWithPlugin = sdk.registerPlugins({
                plugin: TestPlugin,
            })

            expect(SDKWithPlugin.plugin).toBeInstanceOf(TestPlugin)
        })

        it('should throw error if plugin name collides with an existing property', async () => {
            const sdk = await createTestSDK()
            const TestPlugin = testPluginFactory('plugin')
            sdk.registerPlugins({
                plugin: TestPlugin,
            })

            const CollidingPlugin = testPluginFactory('plugin')
            expect(() =>
                sdk.registerPlugins({
                    plugin: CollidingPlugin,
                })
            ).toThrow(
                'Plugin with name plugin collides with an existing property on the SDK instance.'
            )
        })
    })

    describe('array based registration', () => {
        it('should call a plugin constructor when registering', async () => {
            const sdk = await createTestSDK()
            const TestPlugin = testPluginFactory('plugin')

            const SDKWithPlugin = sdk.registerPlugins([TestPlugin])

            expect(SDKWithPlugin.plugin).toBeInstanceOf(TestPlugin)
            expect(TestPlugin).toHaveBeenCalledOnce()
        })

        it('should successfully register a plugin under plugin.name', async () => {
            const sdk = await createTestSDK()
            const TestPlugin = testPluginFactory('plugin')
            const SDKWithPlugin = sdk.registerPlugins([TestPlugin])

            expect(SDKWithPlugin['plugin']).toBeDefined()
        })

        it('should successfully register multiple plugins', async () => {
            const sdk = await createTestSDK()
            const TestPlugin = testPluginFactory('plugin')
            const SecondTestPlugin = testPluginFactory('secondPlugin')
            const SDKWithPlugin = sdk.registerPlugins([
                TestPlugin,
                SecondTestPlugin,
            ])

            expect(SDKWithPlugin.plugin).toBeInstanceOf(TestPlugin)
            expect(SDKWithPlugin.secondPlugin).toBeInstanceOf(SecondTestPlugin)
        })

        it('should throw error if multiple plugins in the array have colliding names', async () => {
            const sdk = await createTestSDK()
            const TestPlugin = testPluginFactory('plugin')
            const CollidingPlugin = testPluginFactory('plugin')

            expect(() =>
                sdk.registerPlugins([TestPlugin, CollidingPlugin])
            ).toThrow(
                'Plugin with name plugin collides with an existing property on the SDK instance.'
            )
        })

        it('should throw error if plugin name collides with an existing registered plugin', async () => {
            const sdk = await createTestSDK()
            const TestPlugin = testPluginFactory('plugin')
            sdk.registerPlugins([TestPlugin])

            const CollidingPlugin = testPluginFactory('plugin')
            expect(() => sdk.registerPlugins([CollidingPlugin])).toThrow(
                'Plugin with name plugin collides with an existing property on the SDK instance.'
            )
        })

        it('should throw error if plugin name collides with an existing property on SDK', async () => {
            const sdk = await createTestSDK()
            const LedgerCollidingPlugin = testPluginFactory('ledger')

            expect(() => sdk.registerPlugins([LedgerCollidingPlugin])).toThrow(
                'Plugin with name ledger collides with an existing property on the SDK instance.'
            )
        })

        it('should throw error if plugin has an empty name', async () => {
            const sdk = await createTestSDK()
            const EmptyNamePlugin = testPluginFactory('')

            expect(() => sdk.registerPlugins([EmptyNamePlugin])).toThrow(
                'Plugin must define a valid non-empty string name.'
            )
        })
    })
})
